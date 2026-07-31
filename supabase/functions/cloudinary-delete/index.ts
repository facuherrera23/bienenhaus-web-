import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const MAX_PUBLIC_IDS = 50;

const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

interface DeleteRequest {
  public_ids: string[];
}

function isServiceRole(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

function isValidPublicId(id: string): boolean {
  // Cloudinary public_ids are alphanumeric with underscores and slashes (for folder paths)
  if (!id || typeof id !== "string") return false;
  if (id.length > 256) return false;
  return /^[a-zA-Z0-9_\-\/]+$/.test(id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary credentials not configured");
    }

    // Require service-role authentication — anonymous callers can no longer wipe storage.
    if (!isServiceRole(req)) {
      return new Response(JSON.stringify({ error: "Service role required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { public_ids } = await req.json() as DeleteRequest;

    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      return new Response(JSON.stringify({ error: "No public_ids provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (public_ids.length > MAX_PUBLIC_IDS) {
      return new Response(JSON.stringify({
        error: `Too many public_ids (max ${MAX_PUBLIC_IDS})`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!public_ids.every(isValidPublicId)) {
      return new Response(JSON.stringify({
        error: "Invalid public_id format"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(
      public_ids.map(async (public_id) => {
        try {
          const timestamp = Math.floor(Date.now() / 1000);
          const signature = await generateSignature(public_id, timestamp);

          const formData = new FormData();
          formData.append("public_id", public_id);
          formData.append("timestamp", timestamp.toString());
          formData.append("api_key", CLOUDINARY_API_KEY!);
          formData.append("signature", signature);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
            { method: "POST", body: formData }
          );

          const result = await response.json();
          return { public_id, success: result.result === "ok" };
        } catch (e) {
          console.error(`Delete failed for ${public_id}`);
          return { public_id, success: false, error: "delete_failed" };
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Cloudinary delete error:", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateSignature(public_id: string, timestamp: number): Promise<string> {
  const stringToSign = `public_id=${public_id}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
