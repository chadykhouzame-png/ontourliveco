import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory best-effort IP throttle: 5 req / minute / IP
const WINDOW_MS = 60_000;
const MAX = 5;
const ipHits = new Map<string, { count: number; resetAt: number }>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const e = ipHits.get(ip);
  if (!e || now >= e.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  e.count++;
  return e.count > MAX;
}

// Bots fill every field, including ones humans never see, and submit instantly.
const MIN_FILL_MS = 1500;

// Privacy-preserving audit log: never store submitted form values.
// The IP is salted-hashed one way so repeat offenders can be grouped without
// the raw address ever being written down.
async function hashIp(ip: string): Promise<string | null> {
  const salt = Deno.env.get("WAITLIST_HASH_SALT");
  if (!salt || ip === "unknown") return null;
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function clientKind(ua: string | null): string {
  if (!ua) return "unknown";
  const v = ua.toLowerCase();
  if (/bot|crawl|spider|curl|python|wget|http/.test(v)) return "bot";
  if (/mobile|iphone|android/.test(v)) return "mobile";
  return "desktop";
}

async function logBlocked(
  reason: "honeypot" | "too_fast" | "rate_limited" | "invalid_body",
  ip: string,
  userAgent: string | null,
  role?: string | null,
) {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    await admin.from("waitlist_blocked_attempts").insert({
      reason,
      role: role === "artist" || role === "venue" ? role : null,
      ip_hash: await hashIp(ip),
      client_kind: clientKind(userAgent),
    });
  } catch (err) {
    console.error("waitlist-signup: could not record blocked attempt", err);
  }
}

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(["artist", "venue"]),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  artistName: z.string().trim().max(100).optional().or(z.literal("")),
  venueName: z.string().trim().max(100).optional().or(z.literal("")),
  company: z.string().max(200).optional(),
  elapsedMs: z.number().nonnegative().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (throttled(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    const result = BodySchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "invalid_body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    parsed = result.data;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, role, firstName, lastName, artistName, venueName, company, elapsedMs } = parsed;

  // Honeypot + submit-speed trap: pretend it worked, store nothing.
  if ((company ?? "").trim().length > 0 || (elapsedMs !== undefined && elapsedMs < MIN_FILL_MS)) {
    console.warn("waitlist-signup: bot submission blocked", { ip, honeypot: Boolean(company) });
    return new Response(JSON.stringify({ position: 1 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (role === "artist" && (!artistName || artistName.length < 1)) {
    return new Response(JSON.stringify({ error: "invalid_artist_name" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (role === "venue" && (!venueName || venueName.length < 1)) {
    return new Response(JSON.stringify({ error: "invalid_venue_name" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("waitlist_signup", {
    p_email: email,
    p_role: role,
    p_ip: ip,
    p_first_name: firstName,
    p_last_name: lastName,
    p_artist_name: role === "artist" ? artistName : null,
    p_venue_name: role === "venue" ? venueName : null,
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    let code = "signup_failed";
    if (msg.includes("rate_limited")) code = "rate_limited";
    else if (msg.includes("invalid_email")) code = "invalid_email";
    else if (msg.includes("invalid_role")) code = "invalid_role";
    else if (msg.includes("invalid_first_name")) code = "invalid_first_name";
    else if (msg.includes("invalid_last_name")) code = "invalid_last_name";
    else if (msg.includes("invalid_artist_name")) code = "invalid_artist_name";
    else if (msg.includes("invalid_venue_name")) code = "invalid_venue_name";
    console.error("waitlist_signup error:", error);
    return new Response(JSON.stringify({ error: code }), {
      status: code === "rate_limited" ? 429 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ position: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
