import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } =
      await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const body = await req.json().catch(() => ({}));
    const webhookEventId = body?.webhook_event_id as string | undefined;
    if (!webhookEventId) throw new Error("webhook_event_id is required");

    const { data: row, error: rowErr } = await supabase
      .from("webhook_events")
      .select("id, event_id, event_type, payload, status")
      .eq("id", webhookEventId)
      .single();
    if (rowErr || !row) throw new Error("Webhook event not found");
    if (!row.payload) throw new Error("Original event has no stored payload");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    // Reconstruct a Stripe-shaped event envelope. Use a fresh id so the retry
    // is logged as its own audit row alongside the original failed event.
    const retryEventId = `evt_retry_${crypto.randomUUID().replace(/-/g, "")}`;
    const event = {
      id: retryEventId,
      object: "event",
      api_version: "2025-08-27.basil",
      created: Math.floor(Date.now() / 1000),
      type: row.event_type,
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: `retry_${row.event_id}` },
      data: { object: row.payload },
    };

    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = await hmacSha256Hex(webhookSecret, signedPayload);
    const stripeSignature = `t=${timestamp},v1=${signature}`;

    const webhookUrl =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-webhook`;

    const started = Date.now();
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": stripeSignature,
      },
      body: payload,
    });
    const durationMs = Date.now() - started;
    const responseText = await res.text();

    // Record attempt for the event's history panel
    await supabase.from("webhook_retry_attempts").insert({
      webhook_event_id: row.id,
      admin_user_id: userData.user.id,
      admin_email: userData.user.email ?? null,
      success: res.ok,
      http_status: res.status,
      duration_ms: durationMs,
      retry_event_id: retryEventId,
      response_body: responseText.slice(0, 2000),
      error_message: res.ok ? null : responseText.slice(0, 500),
    });

    return new Response(
      JSON.stringify({
        success: res.ok,
        status: res.status,
        duration_ms: durationMs,
        original_event_id: row.event_id,
        retry_event_id: retryEventId,
        event_type: row.event_type,
        response_body: responseText.slice(0, 500),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
