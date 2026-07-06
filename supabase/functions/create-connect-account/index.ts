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

    const user = userData.user;

    // Get artist profile
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, stripe_account_id, artist_name")
      .eq("user_id", user.id)
      .single();

    if (artistError || !artist) throw new Error("Artist profile not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // If artist already has a Stripe account, return account link
    if (artist.stripe_account_id) {
      const accountLink = await stripe.accountLinks.create({
        account: artist.stripe_account_id,
        refresh_url: `${req.headers.get("origin")}/artist/dashboard?stripe=refresh`,
        return_url: `${req.headers.get("origin")}/artist/dashboard?stripe=complete`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ url: accountLink.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new Express connected account
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: { artist_id: artist.id, user_id: user.id },
      business_profile: {
        name: artist.artist_name,
      },
    });

    // Save stripe_account_id to artist profile
    await supabase
      .from("artists")
      .update({ stripe_account_id: account.id })
      .eq("id", artist.id);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/artist/dashboard?stripe=refresh`,
      return_url: `${req.headers.get("origin")}/artist/dashboard?stripe=complete`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
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
