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
    // Admin-only: verify JWT + admin role
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

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey.startsWith("sk_test_")) {
      throw new Error(
        "STRIPE_SECRET_KEY is not a test key. This tool only runs in Stripe test mode."
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer") ||
      "https://app.ontourlive.co";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userData.user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Webhook Test Charge" },
            unit_amount: 100, // $1.00 test
          },
          quantity: 1,
        },
      ],
      metadata: {
        purpose: "webhook_test",
        triggered_by: userData.user.id,
      },
      success_url: `${origin}/admin?webhook_test=success`,
      cancel_url: `${origin}/admin?webhook_test=canceled`,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
