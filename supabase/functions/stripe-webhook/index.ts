import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiter: max 100 requests per 60 seconds per IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now >= entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean stale entries (every ~500 requests)
let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter % 500 !== 0) return;
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now >= entry.resetAt) ipHits.delete(ip);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  maybeCleanup();
  if (isRateLimited(clientIp)) {
    console.warn(`Rate limited webhook request from ${clientIp}`);
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Retry-After": "60" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  let event: Stripe.Event;

  if (!signature || !webhookSecret) {
    console.error("Missing stripe-signature header or STRIPE_WEBHOOK_SECRET");
    return new Response(JSON.stringify({ error: "Missing signature or secret" }), { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId && session.payment_status === "paid") {
          await supabase
            .from("booking_requests")
            .update({
              payment_status: "paid",
              payment_intent_id: session.payment_intent as string,
            })
            .eq("id", bookingId);

          console.log(`Payment completed for booking ${bookingId}`);

          // Create notification for the artist
          const { data: booking } = await supabase
            .from("booking_requests")
            .select("artist_id, artists!booking_requests_artist_id_fkey(user_id)")
            .eq("id", bookingId)
            .single();

          if (booking?.artists?.user_id) {
            await supabase.from("notifications").insert({
              user_id: booking.artists.user_id,
              title: "Payment Received",
              message: "Payment for your booking has been received!",
              type: "payment",
              reference_id: bookingId,
              reference_type: "booking",
            });
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        if (account.charges_enabled && account.payouts_enabled) {
          await supabase
            .from("artists")
            .update({ stripe_onboarding_complete: true })
            .eq("stripe_account_id", account.id);

          console.log(`Artist Stripe onboarding complete for account ${account.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
