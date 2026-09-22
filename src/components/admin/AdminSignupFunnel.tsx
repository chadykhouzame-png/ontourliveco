import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp } from "lucide-react";

type Signup = { email: string; role: string | null; created_at: string };
type LogRow = {
  email: string;
  status: "sent" | "suppressed" | "failed";
  trigger_source: string | null;
  created_at: string;
};

type Range = 7 | 30 | 90;

type DayRow = {
  day: string;
  label: string;
  artists: number;
  venues: number;
  signups: number;
  attempted: number;
  delivered: number;
  deliveryRate: number | null;
  completionRate: number | null;
};

function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export default function AdminSignupFunnel() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [range, setRange] = useState<Range>(30);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - range * 86400000).toISOString();
    const [signupRes, logRes] = await Promise.all([
      supabase
        .from("waitlist")
        .select("email, role, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(2000),
      supabase
        .from("waitlist_email_log")
        .select("email, status, trigger_source, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(4000),
    ]);
    setSignups((signupRes.data as Signup[]) ?? []);
    setLogs((logRes.data as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const days = useMemo<DayRow[]>(() => {
    const map = new Map<string, DayRow>();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = format(d, "yyyy-MM-dd");
      map.set(key, {
        day: key,
        label: format(d, "d MMM"),
        artists: 0,
        venues: 0,
        signups: 0,
        attempted: 0,
        delivered: 0,
        deliveryRate: null,
        completionRate: null,
      });
    }

    const deliveredEmails = new Set(
      logs.filter((l) => l.status === "sent").map((l) => l.email.toLowerCase()),
    );
    const attemptedEmails = new Set(logs.map((l) => l.email.toLowerCase()));

    for (const s of signups) {
      const row = map.get(dayKey(s.created_at));
      if (!row) continue;
      row.signups += 1;
      if (s.role === "artist") row.artists += 1;
      else if (s.role === "venue") row.venues += 1;
      const key = s.email.toLowerCase();
      if (attemptedEmails.has(key)) row.attempted += 1;
      if (deliveredEmails.has(key)) row.delivered += 1;
    }

    for (const row of map.values()) {
      row.deliveryRate = row.attempted > 0 ? Math.round((row.delivered / row.attempted) * 100) : null;
      row.completionRate = row.signups > 0 ? Math.round((row.delivered / row.signups) * 100) : null;
    }
    return [...map.values()];
  }, [signups, logs, range]);

  const totals = useMemo(() => {
    const t = days.reduce(
      (acc, d) => ({
        artists: acc.artists + d.artists,
        venues: acc.venues + d.venues,
        signups: acc.signups + d.signups,
        attempted: acc.attempted + d.attempted,
        delivered: acc.delivered + d.delivered,
      }),
      { artists: 0, venues: 0, signups: 0, attempted: 0, delivered: 0 },
    );
    return {
      ...t,
      deliveryRate: t.attempted > 0 ? Math.round((t.delivered / t.attempted) * 100) : 0,
      completionRate: t.signups > 0 ? Math.round((t.delivered / t.signups) * 100) : 0,
      noEmail: t.signups - t.attempted,
    };
  }, [days]);

  const stats = [
    { label: "Artist sign-ups", value: totals.artists },
    { label: "Venue sign-ups", value: totals.venues },
    { label: "Confirmations attempted", value: totals.attempted },
    { label: "Confirmations delivered", value: totals.delivered },
    { label: "Delivery rate", value: `${totals.deliveryRate}%` },
    { label: "Completion rate", value: `${totals.completionRate}%` },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Sign-up funnel
            </CardTitle>
            <CardDescription>
              Artist and venue sign-ups, confirmation emails sent, and how many reached the inbox.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {([7, 30, 90] as Range[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                onClick={() => setRange(r)}
              >
                {r}d
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              {stats.map((s) => (
                <div key={s.label} className="rounded-lg border p-3">
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <span className="mt-1 block text-2xl font-semibold">{s.value}</span>
                </div>
              ))}
            </div>

            {totals.noEmail > 0 && (
              <p className="text-sm text-muted-foreground">
                {totals.noEmail} sign-up{totals.noEmail === 1 ? " has" : "s have"} no confirmation
                email recorded at all.
              </p>
            )}

            <div>
              <h4 className="mb-2 text-sm font-medium">Sign-ups per day</h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="artists" name="Artists" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="venues" name="Venues" stackId="a" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">Delivery and completion rate (%)</h4>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => (v === null ? "—" : `${v}%`)} />
                  <Line
                    type="monotone"
                    dataKey="deliveryRate"
                    name="Delivery rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    connectNulls
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="Completion rate"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    connectNulls
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
