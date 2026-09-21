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
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CalendarIcon, LineChart as LineChartIcon, RefreshCw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

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

type DrillStatus = 'all' | 'processed' | 'pending' | 'failed';

type DetailRow = {
  id: string;
  event_id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

const STATUS_LABEL: Record<DrillStatus, string> = {
  all: 'All events',
  processed: 'Processed events',
  pending: 'Pending events',
  failed: 'Failed events',
};

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

const BROWSER_TZ =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const TIMEZONES = Array.from(
  new Set([
    BROWSER_TZ,
    'UTC',
    'Australia/Sydney',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
  ]),
);

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKeyIn(date: Date, timeZone: string) {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function labelFor(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'd MMM');
}

export default function AdminWebhookCharts() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [days, setDays] = useState<Range | null>(14);
  const [range, setRange] = useState<DateRange | undefined>();
  const [timeZone, setTimeZone] = useState<string>(BROWSER_TZ);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ day: string; status: DrillStatus } | null>(null);
  const [drillRows, setDrillRows] = useState<DetailRow[] | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  // Day keys (in the selected timezone) that make up the chart x-axis.
  const dayKeys = useMemo(() => {
    const keys: string[] = [];
    if (days) {
      for (let i = days - 1; i >= 0; i--) {
        keys.push(dayKeyIn(new Date(Date.now() - i * DAY_MS), timeZone));
      }
      return keys;
    }
    if (range?.from) {
      const end = range.to ?? range.from;
      const cursor = new Date(range.from);
      cursor.setHours(12, 0, 0, 0);
      const stop = new Date(end);
      stop.setHours(12, 0, 0, 0);
      let guard = 0;
      while (cursor.getTime() <= stop.getTime() && guard < 400) {
        keys.push(dayKeyIn(cursor, timeZone));
        cursor.setTime(cursor.getTime() + DAY_MS);
        guard++;
      }
    }
    return Array.from(new Set(keys));
  }, [days, range, timeZone]);

  const load = useCallback(async () => {
    if (dayKeys.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Pad by a day either side so timezone shifts are covered, then filter by day key.
    const first = new Date(`${dayKeys[0]}T00:00:00Z`).getTime() - DAY_MS;
    const last = new Date(`${dayKeys[dayKeys.length - 1]}T00:00:00Z`).getTime() + 2 * DAY_MS;
    const { data } = await supabase
      .from('webhook_events')
      .select('id, status, created_at, processed_at')
      .gte('created_at', new Date(first).toISOString())
      .lte('created_at', new Date(last).toISOString())
      .order('created_at', { ascending: true })
      .limit(5000);
    setRows((data ?? []) as EventRow[]);
    setLoading(false);
  }, [dayKeys]);

  useEffect(() => {
    load();
  }, [load]);

  const points = useMemo<Point[]>(() => {
    const buckets = new Map<
      string,
      { processed: number; failed: number; pending: number; durations: number[] }
    >();
    for (const key of dayKeys) {
      buckets.set(key, { processed: 0, failed: 0, pending: 0, durations: [] });
    }
    for (const r of rows) {
      const key = dayKeyIn(new Date(r.created_at), timeZone);
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
        label: labelFor(day),
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
  }, [rows, dayKeys, timeZone]);

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

  // Drill-down: open the events behind a clicked chart point.
  const openDrill = useCallback(
    async (day: string | undefined, status: DrillStatus) => {
      if (!day) return;
      setDrill({ day, status });
      setDrillRows(null);
      setDrillLoading(true);

      const ids = rows
        .filter((r) => dayKeyIn(new Date(r.created_at), timeZone) === day)
        .filter((r) => {
          if (status === 'all') return true;
          if (status === 'processed') return r.status === 'processed';
          if (status === 'failed') return r.status === 'failed';
          return r.status !== 'processed' && r.status !== 'failed';
        })
        .map((r) => r.id);

      if (ids.length === 0) {
        setDrillRows([]);
        setDrillLoading(false);
        return;
      }

      const { data } = await supabase
        .from('webhook_events')
        .select('id, event_id, event_type, status, error_message, created_at, processed_at')
        .in('id', ids.slice(0, 200))
        .order('created_at', { ascending: false });
      setDrillRows((data ?? []) as DetailRow[]);
      setDrillLoading(false);
    },
    [rows, timeZone],
  );

  const pointForLabel = useCallback(
    (label?: string) => points.find((p) => p.label === label),
    [points],
  );

  const drillTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat('en-AU', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    [timeZone],
  );


  const rangeLabel = days
    ? `the last ${days} days`
    : range?.from
      ? `${format(range.from, 'd MMM yyyy')} – ${format(range.to ?? range.from, 'd MMM yyyy')}`
      : 'the selected dates';

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
      <CardHeader className="space-y-4">
        <div className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" /> Health trends
            </CardTitle>
            <CardDescription>
              {totals.total} payment event{totals.total === 1 ? '' : 's'} in {rangeLabel} ·{' '}
              {totals.failureRate}% failed
              {totals.avgSeconds !== null && ` · ${totals.avgSeconds}s average processing time`}.
              Days are grouped in {timeZone.replace('_', ' ')}.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? 'default' : 'outline'}
              onClick={() => {
                setDays(r);
                setRange(undefined);
              }}
            >
              {r}d
            </Button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={days === null ? 'default' : 'outline'}
                className={cn('justify-start text-left font-normal')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {days === null && range?.from
                  ? `${format(range.from, 'd MMM')} – ${format(range.to ?? range.from, 'd MMM')}`
                  : 'Custom range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={range}
                defaultMonth={range?.from}
                disabled={{ after: new Date() }}
                onSelect={(r) => {
                  setRange(r);
                  if (r?.from) setDays(null);
                }}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <Select value={timeZone} onValueChange={setTimeZone}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz === BROWSER_TZ ? `${tz.replace('_', ' ')} (yours)` : tz.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {dayKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pick a start and end date to see trends.</p>
        ) : totals.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `No payment events in ${rangeLabel}.`}
          </p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium mb-2">Events per day</p>
              <p className="text-xs text-muted-foreground mb-2">
                Tap any bar, point or day to see the events behind it.
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={points}
                    onClick={(state: { activeLabel?: string }) =>
                      openDrill(pointForLabel(state?.activeLabel)?.day, 'all')
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis allowDecimals={false} {...axis} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                    <Bar
                      dataKey="processed"
                      stackId="a"
                      name="Processed"
                      fill="hsl(var(--primary))"
                      radius={[0, 0, 0, 0]}
                      cursor="pointer"
                      onClick={(d: { payload?: Point }) => openDrill(d?.payload?.day, 'processed')}
                    />
                    <Bar
                      dataKey="pending"
                      stackId="a"
                      name="Pending"
                      fill="hsl(var(--muted-foreground))"
                      cursor="pointer"
                      onClick={(d: { payload?: Point }) => openDrill(d?.payload?.day, 'pending')}
                    />
                    <Bar
                      dataKey="failed"
                      stackId="a"
                      name="Failed"
                      fill="hsl(var(--destructive))"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(d: { payload?: Point }) => openDrill(d?.payload?.day, 'failed')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Failure rate (%)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={points}
                    onClick={(state: { activeLabel?: string }) =>
                      openDrill(pointForLabel(state?.activeLabel)?.day, 'failed')
                    }
                    style={{ cursor: 'pointer' }}
                  >
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
                      activeDot={{ r: 6, cursor: 'pointer' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Average processing time (seconds)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={points}
                    onClick={(state: { activeLabel?: string }) =>
                      openDrill(pointForLabel(state?.activeLabel)?.day, 'processed')
                    }
                    style={{ cursor: 'pointer' }}
                  >
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
                      activeDot={{ r: 6, cursor: 'pointer' }}
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
