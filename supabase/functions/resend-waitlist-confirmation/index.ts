import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { z } from "npm:zod@3.22.4";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
});

// Best-effort per-IP throttle on top of the per-email limit.
const IP_WINDOW_MS = 60_000;
const IP_MAX = 5;
const ipHits = new Map<string, { count: number; resetAt: number }>();
function ipThrottled(ip: string): boolean {
  const now = Date.now();
  const e = ipHits.get(ip);
  if (!e || now >= e.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return false;
  }
  e.count++;
  return e.count > IP_MAX;
}

// Per-address caps: one resend per minute, 3 per hour.
const RESEND_WINDOW_MINUTES = 60;
const RESEND_MAX = 3;
const RESEND_COOLDOWN_SECONDS = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "invalid_email" }, 400);

  const email = parsed.data.email.toLowerCase();

  if (ipThrottled(ip)) return json({ error: "rate_limited" }, 429);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Optional admin path: an authenticated admin can resend for any listed address.
  let isAdmin = false;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) {
      const { data: adminCheck } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      isAdmin = adminCheck === true;
    }
  }

  const since = new Date(Date.now() - RESEND_WINDOW_MINUTES * 60_000).toISOString();
  if (!isAdmin) {
    const { count } = await supabase
      .from("waitlist_email_log")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("trigger_source", "resend")
      .gte("created_at", since);
    if ((count ?? 0) >= RESEND_MAX) return json({ error: "rate_limited" }, 429);
  }

  const { data: entry } = await supabase
    .from("waitlist")
    .select("email, role, first_name, artist_name, venue_name")
    .ilike("email", email)
    .maybeSingle();

  // Never reveal whether an address is on the list.
  if (!entry) return json({ ok: true });

  const role = entry.role === "venue" ? "venue" : "artist";
  const template =
    role === "artist" ? "waitlist-artist-confirmation" : "waitlist-venue-confirmation";
  const triggerSource = isAdmin ? "admin_resend" : "resend";

  let status: "sent" | "suppressed" | "failed" = "failed";
  let reason: string | null = null;
  let errorCode: string | null = null;

  try {
    const result = await sendTemplateEmail(template, entry.email, {
      templateData:
        role === "artist"
          ? { firstName: entry.first_name, artistName: entry.artist_name }
          : { firstName: entry.first_name, venueName: entry.venue_name },
      idempotencyKey: `waitlist-resend-${role}-${email}-${Date.now()}`,
    });
    if (result?.sent) {
      status = "sent";
    } else {
      status = "suppressed";
      reason = (result as { reason?: string })?.reason ?? "not_sent";
    }
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error("resend-waitlist-confirmation: send failed", e?.code ?? e?.message);
    reason = e?.message ? String(e.message).slice(0, 300) : "unknown_error";
    errorCode = e?.code ?? null;
  }

  try {
    await supabase.from("waitlist_email_log").insert({
      email,
      role,
      template,
      status,
      reason,
      error_code: errorCode,
      trigger_source: triggerSource,
    });
  } catch (err) {
    console.error("resend-waitlist-confirmation: could not record outcome", err);
  }

  if (isAdmin) return json({ ok: true, status, reason: reason ?? errorCode });
  return json({ ok: true });
});
