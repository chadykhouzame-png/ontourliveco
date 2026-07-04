import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: artist } = await supabase
      .from("artists")
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", userData.user.id)
      .single();

    const checklist = {
      account_created: false,
      details_submitted: false,
      charges_enabled: false,
      payouts_enabled: false,
      webhook_received: false,
      webhook_event_id: null as string | null,
      webhook_received_at: null as string | null,
      webhook_status: null as string | null,
      stripe_account_id: null as string | null,
      onboarding_complete: false,
    };

    if (!artist?.stripe_account_id) {
      return new Response(JSON.stringify(checklist), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    checklist.account_created = true;
    checklist.stripe_account_id = artist.stripe_account_id;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(artist.stripe_account_id);
    checklist.details_submitted = !!account.details_submitted;
    checklist.charges_enabled = !!account.charges_enabled;
    checklist.payouts_enabled = !!account.payouts_enabled;
    checklist.onboarding_complete =
      checklist.charges_enabled && checklist.payouts_enabled;

    // Look up the most recent account.updated webhook for this Connect account
    const { data: webhookRow } = await supabase
      .from("webhook_events")
      .select("event_id, status, created_at, payload")
      .eq("event_type", "account.updated")
      .eq("payload->>id", artist.stripe_account_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (webhookRow) {
      checklist.webhook_received = true;
      checklist.webhook_event_id = webhookRow.event_id;
      checklist.webhook_received_at = webhookRow.created_at;
      checklist.webhook_status = webhookRow.status;
    }

    // Keep DB in sync
    if (checklist.onboarding_complete !== artist.stripe_onboarding_complete) {
      await supabase
        .from("artists")
        .update({ stripe_onboarding_complete: checklist.onboarding_complete })
        .eq("id", artist.id);
    }

    return new Response(JSON.stringify(checklist), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("verify-payout-setup error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
