// Admin-only read endpoint: look up a webhook_events row by stripe_event_id.
// Requires a valid Supabase JWT for a user with the 'admin' role.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Missing bearer token" });
    }
    const token = authHeader.slice("Bearer ".length);

    // Verify JWT + resolve user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Invalid token" });

    // Admin role check
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr) return json(500, { error: "Role check failed" });
    if (!isAdmin) return json(403, { error: "Admin access required" });

    const url = new URL(req.url);
    const stripeEventId = url.searchParams.get("stripe_event_id");
    if (!stripeEventId || !/^evt_[A-Za-z0-9]{6,}$/.test(stripeEventId)) {
      return json(400, { error: "Invalid or missing stripe_event_id" });
    }

    const { data: row, error: qErr } = await supabase
      .from("webhook_events")
      .select("id, stripe_event_id, event_type, status, error_message, created_at")
      .eq("stripe_event_id", stripeEventId)
      .maybeSingle();

    if (qErr) return json(500, { error: qErr.message });
    if (!row) return json(404, { error: "Not found" });

    return json(200, row);
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
