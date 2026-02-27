import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_PERCENT = 5;

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

    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("bookingId is required");

    // Get booking details with artist and venue info
    const { data: booking, error: bookingError } = await supabase
      .from("booking_requests")
      .select(`
        *,
        artists!booking_requests_artist_id_fkey (
          id, artist_name, stripe_account_id, stripe_onboarding_complete, user_id
        ),
        venues!booking_requests_venue_id_fkey (
          id, venue_name, user_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) throw new Error("Booking not found");

    // Verify the requesting user is the venue owner
    if (booking.venues.user_id !== userData.user.id) {
      throw new Error("Only the venue can initiate payment");
    }

    // Check booking is in accepted status
    if (booking.status !== "accepted") {
      throw new Error("Booking must be accepted before payment");
    }

    // Check payment hasn't already been made
    if (booking.payment_status === "paid") {
      throw new Error("Payment has already been completed");
    }

    // Verify artist has Stripe Connect set up
    const artist = booking.artists;
    if (!artist.stripe_account_id || !artist.stripe_onboarding_complete) {
      throw new Error("Artist has not completed payment setup. Please ask them to set up their payment account.");
    }

    // Calculate amounts (use counter_offer if exists, otherwise offer_amount)
    const totalAmount = booking.counter_offer || booking.offer_amount;
    if (!totalAmount) throw new Error("No payment amount set for this booking");

    const totalAmountCents = totalAmount * 100;
    const platformFee = Math.round(totalAmountCents * PLATFORM_FEE_PERCENT / 100);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "http://localhost:8080";

    // Create Checkout Session with Connect
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Booking: ${artist.artist_name}`,
              description: `${booking.venues.venue_name} - ${booking.requested_date}`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: artist.stripe_account_id,
        },
      },
      success_url: `${origin}/venue-dashboard?payment=success&booking=${bookingId}`,
      cancel_url: `${origin}/venue-dashboard?payment=cancelled&booking=${bookingId}`,
      metadata: {
        booking_id: bookingId,
        artist_id: artist.id,
        venue_id: booking.venues.id,
      },
    });

    // Update booking with payment info
    await supabase
      .from("booking_requests")
      .update({
        payment_status: "pending",
        payment_amount: totalAmount,
        platform_fee: Math.round(platformFee / 100),
        stripe_checkout_session_id: session.id,
      })
      .eq("id", bookingId);

    return new Response(JSON.stringify({ url: session.url }), {
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
