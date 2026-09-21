import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Flag = {
  severity: "critical" | "warning" | "info";
  reason: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number | null;
  currency: string | null;
  paid_at: string | null;
  livemode: boolean;
  booking_request_id: string | null;
  booking_status: string | null;
  booking_payment_status: string | null;
  requested_date: string | null;
};

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

    // --- Admin-only gate -------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body?.days) || 7, 1), 30);
    const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // --- Recent paid checkout sessions -----------------------------------
    const sessions: Stripe.Checkout.Session[] = [];
    let startingAfter: string | undefined;
    for (let page = 0; page < 5; page++) {
      const res: Stripe.ApiList<Stripe.Checkout.Session> = await stripe.checkout
        .sessions.list({
          limit: 100,
          created: { gte: since },
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
      sessions.push(...res.data);
      if (!res.has_more || res.data.length === 0) break;
      startingAfter = res.data[res.data.length - 1].id;
    }

    const paid = sessions.filter((s) => s.payment_status === "paid");

    const sessionIds = paid.map((s) => s.id);
    const intentIds = paid
      .map((s) =>
        typeof s.payment_intent === "string"
          ? s.payment_intent
          : s.payment_intent?.id ?? null
      )
      .filter((v): v is string => !!v);

    // --- Matching bookings -------------------------------------------------
    const { data: bookingsBySession } = sessionIds.length
      ? await supabase
        .from("booking_requests")
        .select(
          "id, status, payment_status, payment_amount, requested_date, stripe_checkout_session_id, payment_intent_id",
        )
        .in("stripe_checkout_session_id", sessionIds)
      : { data: [] as any[] };

    const { data: bookingsByIntent } = intentIds.length
      ? await supabase
        .from("booking_requests")
        .select(
          "id, status, payment_status, payment_amount, requested_date, stripe_checkout_session_id, payment_intent_id",
        )
        .in("payment_intent_id", intentIds)
      : { data: [] as any[] };

    const bySession = new Map<string, any>();
    const byIntent = new Map<string, any>();
    for (const b of [...(bookingsBySession ?? []), ...(bookingsByIntent ?? [])]) {
      if (b.stripe_checkout_session_id) bySession.set(b.stripe_checkout_session_id, b);
      if (b.payment_intent_id) byIntent.set(b.payment_intent_id, b);
    }

    const CONFIRMED_PAYMENT = new Set(["paid", "succeeded", "captured"]);
    const CONFIRMED_STATUS = new Set(["accepted", "completed"]);

    const flags: Flag[] = [];

    for (const s of paid) {
      const intentId = typeof s.payment_intent === "string"
        ? s.payment_intent
        : s.payment_intent?.id ?? null;
      const booking = bySession.get(s.id) ?? (intentId ? byIntent.get(intentId) : null);

      const base = {
        stripe_session_id: s.id,
        stripe_payment_intent_id: intentId,
        amount: s.amount_total ?? null,
        currency: s.currency ?? null,
        paid_at: new Date((s.created ?? 0) * 1000).toISOString(),
        livemode: !!s.livemode,
        booking_request_id: booking?.id ?? null,
        booking_status: booking?.status ?? null,
        booking_payment_status: booking?.payment_status ?? null,
        requested_date: booking?.requested_date ?? null,
      };

      if (!booking) {
        flags.push({
          ...base,
          severity: "warning",
          reason:
            "Payment succeeded at Stripe but no booking in this app matches it.",
        });
        continue;
      }

      const paymentConfirmed = CONFIRMED_PAYMENT.has(
        String(booking.payment_status ?? "").toLowerCase(),
      );
      const statusConfirmed = CONFIRMED_STATUS.has(
        String(booking.status ?? "").toLowerCase(),
      );

      if (!paymentConfirmed) {
        flags.push({
          ...base,
          severity: "critical",
          reason:
            `Paid at Stripe but the booking still shows payment as "${booking.payment_status ?? "none"}".`,
        });
      } else if (!statusConfirmed) {
        flags.push({
          ...base,
          severity: "warning",
          reason:
            `Payment recorded but the booking is still "${booking.status ?? "unknown"}" rather than confirmed.`,
        });
      } else if (
        booking.payment_amount != null && s.amount_total != null &&
        booking.payment_amount !== s.amount_total
      ) {
        flags.push({
          ...base,
          severity: "info",
          reason:
            `Amount mismatch: Stripe took ${s.amount_total}, the booking records ${booking.payment_amount}.`,
        });
      }
    }

    flags.sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 } as const;
      if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
      return (b.paid_at ?? "").localeCompare(a.paid_at ?? "");
    });

    return new Response(
      JSON.stringify({
        success: true,
        days,
        checked_payments: paid.length,
        matched_bookings: paid.length - flags.filter((f) => !f.booking_request_id).length,
        flagged: flags.length,
        critical: flags.filter((f) => f.severity === "critical").length,
        flags,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = /Admin access|authenticated|authorization/i.test(message) ? 403 : 500;
    console.error("reconcile-payments error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
