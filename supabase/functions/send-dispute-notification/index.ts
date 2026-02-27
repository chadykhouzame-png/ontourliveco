import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// On Tour brand
const brand = {
  bg: '#ffffff',
  cardBg: '#0a0a0a',
  cardBorder: '#1f1f23',
  primary: '#c9a88c',
  foreground: '#ddd5cd',
  muted: '#8a7f77',
  mutedDark: '#3d3d3d',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#0ea5e9',
};

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>On Tour Live</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${brand.bg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: ${brand.cardBg}; border-radius: 20px; overflow: hidden; border: 1px solid ${brand.cardBorder};">
      <!-- Header -->
      <div style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid ${brand.cardBorder};">
        <div style="margin-bottom: 4px;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: -0.04em; line-height: 1;">
            <span style="color: ${brand.primary};">ON</span><span style="color: #ffffff;">TOUR</span>
          </span>
        </div>
        <div style="font-size: 11px; letter-spacing: 0.2em; color: ${brand.muted}; text-transform: uppercase; margin-top: 2px;">Live Entertainment</div>
      </div>
      <!-- Content -->
      <div style="padding: 36px 40px;">
        ${content}
      </div>
      <!-- Footer -->
      <div style="padding: 24px 40px; border-top: 1px solid ${brand.cardBorder}; text-align: center;">
        <p style="color: ${brand.mutedDark}; font-size: 13px; margin: 0 0 8px; line-height: 1.5;">
          You're receiving this because you have an account on
          <a href="https://ontourliveco.lovable.app" style="color: ${brand.primary}; text-decoration: none;">On Tour Live</a>.
        </p>
        <p style="color: ${brand.mutedDark}; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} On Tour Live. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

interface DisputeNotificationRequest {
  type: "created" | "resolved" | "dismissed" | "in_review";
  dispute_id: string;
  dispute_title: string;
  dispute_type: string;
  reporter_email?: string;
  resolution?: string;
}

function buildDisputeContent(type: string, dispute_title: string, dispute_type: string, resolution?: string): { subject: string; content: string } {
  const typeLabel = dispute_type.charAt(0).toUpperCase() + dispute_type.slice(1);

  const statusConfig: Record<string, { emoji: string; heading: string; statusLabel: string; statusColor: string; message: string }> = {
    created: {
      emoji: '📋',
      heading: 'Dispute Received',
      statusLabel: 'Open',
      statusColor: brand.info,
      message: 'Thank you for submitting your dispute. We have received your report and our team will review it shortly.',
    },
    in_review: {
      emoji: '🔍',
      heading: 'Dispute Under Review',
      statusLabel: 'In Review',
      statusColor: brand.warning,
      message: 'Your dispute is now being actively reviewed by our team. We will contact you if we need any additional information.',
    },
    resolved: {
      emoji: '✅',
      heading: 'Dispute Resolved',
      statusLabel: 'Resolved',
      statusColor: brand.success,
      message: 'We have completed our review and resolved your dispute. Thank you for bringing this matter to our attention.',
    },
    dismissed: {
      emoji: '📝',
      heading: 'Dispute Closed',
      statusLabel: 'Dismissed',
      statusColor: brand.muted,
      message: 'After careful review, we have closed your dispute. If you believe this decision was made in error, please submit a new dispute with additional details.',
    },
  };

  const config = statusConfig[type] || statusConfig.created;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 40px; margin-bottom: 12px;">${config.emoji}</div>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.02em;">${config.heading}</h1>
    </div>

    <div style="background: #1a1a1e; border-radius: 14px; padding: 20px; margin: 16px 0; border-left: 3px solid ${config.statusColor};">
      <p style="margin: 0 0 10px 0; color: ${brand.foreground}; font-size: 14px;"><strong style="color: ${brand.muted};">Title:</strong> ${dispute_title}</p>
      <p style="margin: 0 0 10px 0; color: ${brand.foreground}; font-size: 14px;"><strong style="color: ${brand.muted};">Type:</strong> ${typeLabel}</p>
      <p style="margin: 0; font-size: 14px;">
        <strong style="color: ${brand.muted};">Status:</strong>
        <span style="color: ${config.statusColor}; font-weight: 600;"> ${config.statusLabel}</span>
      </p>
      ${resolution ? `<p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid ${brand.cardBorder}; color: ${brand.foreground}; font-size: 14px; line-height: 1.6;"><strong style="color: ${brand.muted};">${type === 'dismissed' ? 'Notes' : 'Resolution'}:</strong><br/>${resolution}</p>` : ''}
    </div>

    <p style="color: ${brand.muted}; font-size: 15px; line-height: 1.6; margin: 20px 0 0;">
      ${config.message}
    </p>
  `;

  return { subject: `${config.heading}: ${dispute_title}`, content };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-dispute-notification function called");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DisputeNotificationRequest = await req.json();
    console.log("Request body:", body);

    const { type, dispute_id, dispute_title, dispute_type, reporter_email, resolution } = body;

    // For non-created types, require admin role
    if (type !== "created") {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!type || !dispute_id || !dispute_title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, dispute_id, dispute_title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient email
    let recipientEmail: string | undefined = reporter_email;
    if (!recipientEmail) {
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .select("reporter_user_id")
        .eq("id", dispute_id)
        .single();

      if (disputeError || !dispute) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch dispute details" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", dispute.reporter_user_id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch reporter email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipientEmail = profile.email;
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "No recipient email available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, content } = buildDisputeContent(type, dispute_title, dispute_type, resolution);
    const html = emailShell(content);

    console.log(`Sending ${type} notification to ${recipientEmail}`);

    const emailResponse = await resend.emails.send({
      from: "On Tour <noreply@ontourapp.com>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: `${type} notification sent`, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-dispute-notification function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
