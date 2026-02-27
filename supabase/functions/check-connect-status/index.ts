import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: artist } = await supabase
      .from("artists")
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", userData.user.id)
      .single();

    if (!artist?.stripe_account_id) {
      return new Response(JSON.stringify({ 
        has_account: false, 
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(artist.stripe_account_id);
    const isComplete = account.charges_enabled && account.payouts_enabled;

    // Update onboarding status if changed
    if (isComplete !== artist.stripe_onboarding_complete) {
      await supabase
        .from("artists")
        .update({ stripe_onboarding_complete: isComplete })
        .eq("id", artist.id);
    }

    return new Response(JSON.stringify({
      has_account: true,
      onboarding_complete: isComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
