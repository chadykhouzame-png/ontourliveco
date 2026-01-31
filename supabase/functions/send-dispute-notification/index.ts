import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DisputeNotificationRequest {
  type: "created" | "resolved" | "dismissed" | "in_review";
  dispute_id: string;
  dispute_title: string;
  dispute_type: string;
  reporter_email?: string;
  resolution?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-dispute-notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body early to check type
    const body: DisputeNotificationRequest = await req.json();
    console.log("Request body:", body);

    const { type, dispute_id, dispute_title, dispute_type, reporter_email, resolution } = body;

    // For "created" type, allow any authenticated user (the reporter themselves)
    // For other types (in_review, resolved, dismissed), require admin role
    if (type !== "created") {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        console.error("User is not an admin:", roleError);
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Body already parsed above

    // Validate required fields
    if (!type || !dispute_id || !dispute_title) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, dispute_id, dispute_title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get reporter email if not provided
    let recipientEmail: string | undefined = reporter_email;
    if (!recipientEmail) {
      // Fetch the dispute to get reporter's user_id
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .select("reporter_user_id")
        .eq("id", dispute_id)
        .single();

      if (disputeError || !dispute) {
        console.error("Failed to fetch dispute:", disputeError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch dispute details" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's email from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", dispute.reporter_user_id)
        .single();

      if (profileError || !profile) {
        console.error("Failed to fetch profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch reporter email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipientEmail = profile.email;
    }

    // Build email content based on notification type
    let subject: string;
    let htmlContent: string;

    const typeLabel = dispute_type.charAt(0).toUpperCase() + dispute_type.slice(1);

    switch (type) {
      case "created":
        subject = `Dispute Received: ${dispute_title}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Dispute Received</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Thank you for submitting your dispute. We have received your report and our team will review it shortly.
            </p>
            <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${dispute_title}</p>
              <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${typeLabel}</p>
              <p style="margin: 0;"><strong>Status:</strong> Open</p>
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              We will notify you once we have reviewed your dispute and taken action.
            </p>
            <p style="color: #888; font-size: 14px; margin-top: 30px;">
              — The On Tour Team
            </p>
          </div>
        `;
        break;

      case "in_review":
        subject = `Dispute Under Review: ${dispute_title}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Dispute Under Review</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Your dispute is now being actively reviewed by our team.
            </p>
            <div style="background: #e3f2fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${dispute_title}</p>
              <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${typeLabel}</p>
              <p style="margin: 0;"><strong>Status:</strong> In Review</p>
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              We will contact you if we need any additional information and notify you of the outcome.
            </p>
            <p style="color: #888; font-size: 14px; margin-top: 30px;">
              — The On Tour Team
            </p>
          </div>
        `;
        break;

      case "resolved":
        subject = `Dispute Resolved: ${dispute_title}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Dispute Resolved</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              We have completed our review and resolved your dispute.
            </p>
            <div style="background: #e8f5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${dispute_title}</p>
              <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${typeLabel}</p>
              <p style="margin: 0 0 10px 0;"><strong>Status:</strong> Resolved</p>
              ${resolution ? `<p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #c8e6c9;"><strong>Resolution:</strong><br/>${resolution}</p>` : ""}
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Thank you for bringing this matter to our attention. If you have any further questions, please don't hesitate to reach out.
            </p>
            <p style="color: #888; font-size: 14px; margin-top: 30px;">
              — The On Tour Team
            </p>
          </div>
        `;
        break;

      case "dismissed":
        subject = `Dispute Closed: ${dispute_title}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Dispute Closed</h1>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              After careful review, we have closed your dispute.
            </p>
            <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${dispute_title}</p>
              <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${typeLabel}</p>
              <p style="margin: 0 0 10px 0;"><strong>Status:</strong> Dismissed</p>
              ${resolution ? `<p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #e0e0e0;"><strong>Notes:</strong><br/>${resolution}</p>` : ""}
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              If you believe this decision was made in error or have additional information to provide, please submit a new dispute with the additional details.
            </p>
            <p style="color: #888; font-size: 14px; margin-top: 30px;">
              — The On Tour Team
            </p>
          </div>
        `;
        break;

      default:
        console.error("Invalid notification type:", type);
        return new Response(
          JSON.stringify({ error: "Invalid notification type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Final check for recipient email
    if (!recipientEmail) {
      console.error("No recipient email available");
      return new Response(
        JSON.stringify({ error: "No recipient email available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending ${type} notification to ${recipientEmail}`);

    const emailResponse = await resend.emails.send({
      from: "On Tour <noreply@ontourapp.com>",
      to: [recipientEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: `${type} notification sent`, data: emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-dispute-notification function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
