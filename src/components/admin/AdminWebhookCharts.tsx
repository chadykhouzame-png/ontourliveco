import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LineChart as LineChartIcon, RefreshCw } from 'lucide-react';

type EventRow = {
  id: string;
  status: string;
  created_at: string;
  processed_at: string | null;
};

type Point = {
  day: string;
  label: string;
  processed: number;
  failed: number;
  pending: number;
  total: number;
  failureRate: number;
  avgSeconds: number | null;
};

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

export default function AdminWebhookCharts() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [days, setDays] = useState<Range>(14);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (range: Range) => {
    setLoading(true);
    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('webhook_events')
      .select('id, status, created_at, processed_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(5000);
    setRows((data ?? []) as EventRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(days);
  }, [load, days]);

  const points = useMemo<Point[]>(() => {
    const buckets = new Map<string, { processed: number; failed: number; pending: number; durations: number[] }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      buckets.set(format(d, 'yyyy-MM-dd'), {
        processed: 0,
        failed: 0,
        pending: 0,
        durations: [],
      });
    }
    for (const r of rows) {
      const key = format(new Date(r.created_at), 'yyyy-MM-dd');
      const b = buckets.get(key);
      if (!b) continue;
      if (r.status === 'processed') b.processed += 1;
      else if (r.status === 'failed') b.failed += 1;
      else b.pending += 1;
      if (r.processed_at) {
        const ms = new Date(r.processed_at).getTime() - new Date(r.created_at).getTime();
        if (ms >= 0 && ms < 1000 * 60 * 60) b.durations.push(ms / 1000);
      }
    }
    return Array.from(buckets.entries()).map(([day, b]) => {
      const total = b.processed + b.failed + b.pending;
      return {
        day,
        label: format(new Date(day), 'd MMM'),
        processed: b.processed,
        failed: b.failed,
        pending: b.pending,
        total,
        failureRate: total > 0 ? Math.round((b.failed / total) * 1000) / 10 : 0,
        avgSeconds:
          b.durations.length > 0
            ? Math.round((b.durations.reduce((s, v) => s + v, 0) / b.durations.length) * 100) / 100
            : null,
      };
    });
  }, [rows, days]);

  const totals = useMemo(() => {
    const total = points.reduce((s, p) => s + p.total, 0);
    const failed = points.reduce((s, p) => s + p.failed, 0);
    const timed = points.filter((p) => p.avgSeconds !== null);
    return {
      total,
      failed,
      failureRate: total > 0 ? Math.round((failed / total) * 1000) / 10 : 0,
      avgSeconds:
        timed.length > 0
          ? Math.round((timed.reduce((s, p) => s + (p.avgSeconds ?? 0), 0) / timed.length) * 100) /
            100
          : null,
    };
  }, [points]);

  const axis = { stroke: 'hsl(var(--muted-foreground))', fontSize: 12 };
  const tooltipStyle = {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5" /> Health trends
          </CardTitle>
          <CardDescription>
            {totals.total} payment event{totals.total === 1 ? '' : 's'} in the last {days} days ·{' '}
            {totals.failureRate}% failed
            {totals.avgSeconds !== null && ` · ${totals.avgSeconds}s average processing time`}.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? 'default' : 'outline'}
              onClick={() => setDays(r)}
            >
              {r}d
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => load(days)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {totals.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `No payment events in the last ${days} days.`}
          </p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium mb-2">Events per day</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis allowDecimals={false} {...axis} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="processed"
                      stackId="a"
                      name="Processed"
                      fill="hsl(var(--primary))"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      stackId="a"
                      name="Pending"
                      fill="hsl(var(--muted-foreground))"
                    />
                    <Bar
                      dataKey="failed"
                      stackId="a"
                      name="Failed"
                      fill="hsl(var(--destructive))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Failure rate (%)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points}>
                    <defs>
                      <linearGradient id="failRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis domain={[0, 100]} unit="%" {...axis} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [`${v}%`, 'Failure rate']}
                    />
                    <Area
                      type="monotone"
                      dataKey="failureRate"
                      name="Failure rate"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      fill="url(#failRate)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Average processing time (seconds)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [`${v}s`, 'Average']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgSeconds"
                      name="Average"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
