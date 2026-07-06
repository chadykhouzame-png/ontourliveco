import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const brand = {
  bg: "#ffffff",
  cardBg: "#0a0a0a",
  cardBorder: "#1f1f23",
  primary: "#c9a88c",
  muted: "#8a7f77",
  mutedDark: "#3d3d3d",
  danger: "#ef4444",
};

interface AlertBody {
  source: string; // e.g. "stripe-webhook"
  stage: string; // e.g. "signature", "handler"
  event_id?: string | null;
  event_type?: string | null;
  error_message: string;
  ip?: string | null;
  occurred_at?: string;
}

function renderEmail(a: AlertBody): { subject: string; html: string } {
  const when = a.occurred_at ?? new Date().toISOString();
  const subject = `⚠️ Webhook failure: ${a.source} (${a.stage})`;
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 12px;color:${brand.muted};font-size:12px;text-transform:uppercase;letter-spacing:.08em;width:130px;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;color:#ddd5cd;font-size:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;">${value}</td>
    </tr>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${brand.bg};font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <div style="background:${brand.cardBg};border:1px solid ${brand.cardBorder};border-radius:20px;overflow:hidden;">
      <div style="padding:28px 36px;border-bottom:1px solid ${brand.cardBorder};">
        <div style="font-size:11px;letter-spacing:.2em;color:${brand.danger};text-transform:uppercase;margin-bottom:4px;">Webhook Alert</div>
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.02em;">Delivery failed</div>
      </div>
      <div style="padding:24px 36px;">
        <table style="width:100%;border-collapse:collapse;background:#111114;border:1px solid ${brand.cardBorder};border-radius:12px;overflow:hidden;">
          ${row("Source", escapeHtml(a.source))}
          ${row("Stage", escapeHtml(a.stage))}
          ${row("Event type", escapeHtml(a.event_type ?? "—"))}
          ${row("Event ID", escapeHtml(a.event_id ?? "—"))}
          ${row("IP", escapeHtml(a.ip ?? "—"))}
          ${row("Time", escapeHtml(when))}
          ${row("Error", escapeHtml(a.error_message))}
        </table>
        <p style="color:${brand.muted};font-size:13px;margin:20px 0 0;line-height:1.6;">
          Review this in the admin dashboard → Webhook Events. You can retry from there once the underlying issue is resolved.
        </p>
      </div>
      <div style="padding:18px 36px;border-top:1px solid ${brand.cardBorder};text-align:center;">
        <p style="color:${brand.mutedDark};font-size:12px;margin:0;">On Tour Live · Automated alert</p>
      </div>
    </div>
  </div>
</body></html>`;
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

async function resolveAdminEmails(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const override = Deno.env.get("WEBHOOK_ALERT_EMAIL_TO");
  if (override) return override.split(",").map((s) => s.trim()).filter(Boolean);

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error || !roles?.length) return [];

  const emails: string[] = [];
  for (const r of roles as { user_id: string }[]) {
    // @ts-ignore admin api present with service role
    const { data } = await supabase.auth.admin.getUserById(r.user_id);
    const email = data?.user?.email;
    if (email) emails.push(email);
  }
  return emails;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as AlertBody;
    if (!body?.source || !body?.stage || !body?.error_message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const to = await resolveAdminEmails(supabase);
    if (!to.length) {
      console.warn("No admin recipient resolved for webhook alert");
      return new Response(JSON.stringify({ skipped: true, reason: "no_admin_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
    const { subject, html } = renderEmail(body);

    const { error: sendErr } = await resend.emails.send({
      from: "On Tour Alerts <alerts@ontourlive.co>",
      to,
      subject,
      html,
    });

    if (sendErr) {
      console.error("Resend error:", sendErr);
      return new Response(JSON.stringify({ error: sendErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true, recipients: to.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-webhook-failure-alert error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
