import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Metric = "failure_rate" | "processing_time" | "pending_count";

interface Rule {
  id: string;
  metric: Metric;
  enabled: boolean;
  threshold: number;
  window_minutes: number;
  min_events: number;
  cooldown_minutes: number;
  notify_email: boolean;
  last_triggered_at: string | null;
}

const LABEL: Record<Metric, string> = {
  failure_rate: "Failure rate",
  processing_time: "Average processing time",
  pending_count: "Pending events",
};

const unit = (m: Metric) => (m === "failure_rate" ? "%" : m === "processing_time" ? "s" : "");

function describe(rule: Rule, value: number, sample: number): string {
  const v = `${Math.round(value * 100) / 100}${unit(rule.metric)}`;
  const t = `${rule.threshold}${unit(rule.metric)}`;
  return `${LABEL[rule.metric]} is ${v} over the last ${rule.window_minutes} minutes (threshold ${t}, ${sample} events).`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    let authorised = token.length > 0 && token === serviceKey;

    if (!authorised && token) {
      const { data: userData } = await supabase.auth.getUser(token);
      const uid = userData?.user?.id;
      if (uid) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        authorised = Boolean(isAdmin);
      }
    }

    if (!authorised) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rules, error: rulesErr } = await supabase
      .from("webhook_alert_rules")
      .select("*")
      .eq("enabled", true);
    if (rulesErr) throw rulesErr;

    const results: Array<{
      metric: Metric;
      value: number;
      sample: number;
      breached: boolean;
      alerted: boolean;
      reason?: string;
    }> = [];

    for (const rule of (rules ?? []) as Rule[]) {
      const since = new Date(Date.now() - rule.window_minutes * 60 * 1000).toISOString();
      const { data: events, error: evErr } = await supabase
        .from("webhook_events")
        .select("id,status,created_at,processed_at")
        .gte("created_at", since);
      if (evErr) throw evErr;

      const rows = (events ?? []) as Array<{
        status: string;
        created_at: string;
        processed_at: string | null;
      }>;

      let value = 0;
      let sample = rows.length;

      if (rule.metric === "failure_rate") {
        const failed = rows.filter((r) => r.status === "failed").length;
        value = rows.length ? (failed / rows.length) * 100 : 0;
      } else if (rule.metric === "processing_time") {
        const durations = rows
          .filter((r) => r.processed_at)
          .map(
            (r) =>
              (new Date(r.processed_at as string).getTime() -
                new Date(r.created_at).getTime()) /
              1000,
          )
          .filter((n) => n >= 0);
        sample = durations.length;
        value = durations.length
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;
      } else {
        const pending = rows.filter(
          (r) => r.status !== "processed" && r.status !== "failed",
        ).length;
        sample = pending;
        value = pending;
      }

      const enoughData = sample >= rule.min_events;
      const breached = enoughData && value >= rule.threshold;

      const cooldownOver =
        !rule.last_triggered_at ||
        Date.now() - new Date(rule.last_triggered_at).getTime() >=
          rule.cooldown_minutes * 60 * 1000;

      let alerted = false;
      let reason: string | undefined;

      if (breached && cooldownOver) {
        const message = describe(rule, value, sample);
        let notified = false;

        if (rule.notify_email) {
          try {
            const res = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-webhook-failure-alert`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({
                  source: "webhook-monitor",
                  stage: rule.metric,
                  event_type: LABEL[rule.metric],
                  error_message: message,
                }),
              },
            );
            const payload = await res.json().catch(() => ({}));
            notified = Boolean(payload?.sent);
          } catch (_e) {
            notified = false;
          }
        }

        if (!rule.notify_email || !notified) {
          // Always keep a record in the alert history, even when email is off/throttled.
          await supabase.from("webhook_failure_alerts").insert({
            source: "webhook-monitor",
            stage: rule.metric,
            event_type: LABEL[rule.metric],
            error_message: message,
            burst_count: 1,
            notified,
          });
        }

        alerted = true;
        reason = message;
      } else if (breached) {
        reason = "in cooldown";
      } else if (!enoughData) {
        reason = "not enough events";
      }

      await supabase
        .from("webhook_alert_rules")
        .update({
          last_checked_at: new Date().toISOString(),
          last_value: Math.round(value * 100) / 100,
          ...(alerted ? { last_triggered_at: new Date().toISOString() } : {}),
        })
        .eq("id", rule.id);

      results.push({
        metric: rule.metric,
        value: Math.round(value * 100) / 100,
        sample,
        breached,
        alerted,
        reason,
      });
    }

    return new Response(
      JSON.stringify({ success: true, checked_at: new Date().toISOString(), results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("evaluate-webhook-alerts failed", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
