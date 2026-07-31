import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const IDENTIFIER_MAX_LEN = 256;

const UPSTASH_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

interface RateLimitRequest {
  identifier: string;
  action: "check" | "record" | "clear";
}

function failOpen(): { allowed: boolean; attempts: number } {
  // Fail-OPEN by design: rate limit is a UX defense, not a security boundary.
  // The real defense is short-lived JWTs + verified admin auth.
  console.warn("Rate limit fail-open (Upstash unavailable)");
  return { allowed: true, attempts: 0 };
}

async function upstashIncr(key: string, ttlSeconds: number): Promise<number> {
  // Atomic INCR (the previous GET-then-SET had a TOCTOU race)
  const url = `${UPSTASH_URL}/incr/${key}?ex=${ttlSeconds}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Upstash INCR failed: ${res.status}`);
  const data = await res.json();
  return typeof data.result === "number" ? data.result : parseInt(data.result, 10);
}

async function upstashGet(key: string): Promise<number | null> {
  const res = await fetch(`${UPSTASH_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (res.status === 404) return 0;
  if (!res.ok) throw new Error(`Upstash GET failed: ${res.status}`);
  const data = await res.json();
  if (!data.result) return 0;
  return typeof data.result === "number" ? data.result : parseInt(data.result, 10);
}

async function upstashDel(key: string): Promise<void> {
  await fetch(`${UPSTASH_URL}/del/${key}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
}

function isValidIdentifier(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  if (id.length > IDENTIFIER_MAX_LEN) return false;
  return /^[a-zA-Z0-9_.@:\-]+$/.test(id);
}

async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remainingTime?: number; attempts: number }> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return failOpen();

  const key = `ratelimit:admin:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    const attempts = await upstashGet(key);
    if (attempts !== null && attempts >= MAX_ATTEMPTS) {
      return { allowed: false, remainingTime: LOCKOUT_SECONDS, attempts };
    }
    return { allowed: true, attempts: attempts ?? 0 };
  } catch (e) {
    console.error("Rate limit check error:", e instanceof Error ? e.message : e);
    return failOpen();
  }
}

async function recordAttempt(identifier: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const key = `ratelimit:admin:${identifier}`;

  try {
    // Atomic INCR with TTL on first write; subsequent INCRs preserve the original TTL.
    // This eliminates the previous TOCTOU race window.
    await upstashIncr(key, LOCKOUT_SECONDS);
  } catch (e) {
    console.error("Record attempt error:", e instanceof Error ? e.message : e);
  }
}

async function clearRateLimit(identifier: string): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const key = `ratelimit:admin:${identifier}`;
  try {
    await upstashDel(key);
  } catch (e) {
    console.error("Clear rate limit error:", e instanceof Error ? e.message : e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as RateLimitRequest;

    if (!body.identifier || !isValidIdentifier(body.identifier)) {
      return new Response(JSON.stringify({ error: "Invalid identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["check", "record", "clear"].includes(body.action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 'clear' is dangerous if exposed to anonymous callers — they could clear another user's lockout.
    // Require an explicit service-role token to clear (the admin client uses service_role via JWT forwarding).
    if (body.action === "clear") {
      const auth = req.headers.get("authorization") ?? "";
      const token = auth.replace(/^Bearer\s+/i, "");
      let isService = false;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        isService = payload?.role === "service_role";
      } catch { /* */ }
      if (!isService) {
        return new Response(JSON.stringify({ error: "Service role required to clear rate limit" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let result;
    switch (body.action) {
      case "check":
        result = await checkRateLimit(body.identifier);
        break;
      case "record":
        await recordAttempt(body.identifier);
        result = { success: true };
        break;
      case "clear":
        await clearRateLimit(body.identifier);
        result = { success: true };
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Rate limit function error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
