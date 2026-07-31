import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const UPSTASH_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

interface RateLimitRequest {
  identifier: string;
  action: "check" | "record" | "clear";
}

async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remainingTime?: number; attempts: number }> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn("Upstash not configured, allowing request (dev mode)");
    return { allowed: true, attempts: 0 };
  }

  const key = `ratelimit:admin:${identifier}`;
  const now = Date.now();
  const windowMs = LOCKOUT_MINUTES * 60 * 1000;

  try {
    const response = await fetch(`${UPSTASH_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { allowed: true, attempts: 0 };
      }
      throw new Error(`Upstash error: ${response.status}`);
    }

    const data = await response.json();
    const attempts = parseInt(data.result || "0");
    const lockedUntil = parseInt(data.lockedUntil || "0");

    if (lockedUntil > now) {
      return { allowed: false, remainingTime: lockedUntil - now, attempts };
    }

    if (attempts >= MAX_ATTEMPTS) {
      const newLockedUntil = now + windowMs;
      await fetch(`${UPSTASH_URL}/set/${key}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value: attempts.toString(), lockedUntil: newLockedUntil.toString(), ex: LOCKOUT_MINUTES * 60 }),
      });
      return { allowed: false, remainingTime: windowMs, attempts };
    }

    return { allowed: true, attempts };
  } catch (e) {
    console.error("Rate limit check error:", e);
    return { allowed: true, attempts: 0 };
  }
}

async function recordAttempt(identifier: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const key = `ratelimit:admin:${identifier}`;
  const now = Date.now();
  const windowMs = LOCKOUT_MINUTES * 60 * 1000;

  try {
    const response = await fetch(`${UPSTASH_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    let attempts = 0;
    if (response.ok) {
      const data = await response.json();
      attempts = parseInt(data.result || "0");
    }

    attempts += 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? now + windowMs : 0;

    await fetch(`${UPSTASH_URL}/set/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: attempts.toString(), lockedUntil: lockedUntil.toString(), ex: LOCKOUT_MINUTES * 60 }),
    });
  } catch (e) {
    console.error("Record attempt error:", e);
  }
}

async function clearRateLimit(identifier: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const key = `ratelimit:admin:${identifier}`;
  try {
    await fetch(`${UPSTASH_URL}/del/${key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
  } catch (e) {
    console.error("Clear rate limit error:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { identifier, action } = await req.json() as RateLimitRequest;

    if (!identifier) {
      return new Response(JSON.stringify({ error: "Missing identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;
    switch (action) {
      case "check":
        result = await checkRateLimit(identifier);
        break;
      case "record":
        await recordAttempt(identifier);
        result = { success: true };
        break;
      case "clear":
        await clearRateLimit(identifier);
        result = { success: true };
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Rate limit function error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});