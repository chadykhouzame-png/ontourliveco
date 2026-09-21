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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckCircle2, LineChart as LineChartIcon, RefreshCw, XCircle } from 'lucide-react';
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
  payload: unknown;
};

type AttemptRow = {
  id: string;
  success: boolean;
  http_status: number | null;
  duration_ms: number | null;
  retry_event_id: string | null;
  response_body: string | null;
  error_message: string | null;
  admin_email: string | null;
  created_at: string;
};

const DETAIL_COLUMNS =
  'id, event_id, event_type, status, error_message, created_at, processed_at, payload';

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
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [retryResults, setRetryResults] = useState<Record<string, { success: boolean; message?: string }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Record<string, AttemptRow[]>>({});
  const [attemptsLoading, setAttemptsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAttempts = useCallback(async (eventId: string) => {
    setAttemptsLoading(eventId);
    const { data } = await supabase
      .from('webhook_retry_attempts')
      .select(
        'id, success, http_status, duration_ms, retry_event_id, response_body, error_message, admin_email, created_at',
      )
      .eq('webhook_event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(20);
    setAttempts((prev) => ({ ...prev, [eventId]: (data ?? []) as AttemptRow[] }));
    setAttemptsLoading(null);
  }, []);

  const toggleExpanded = useCallback(
    (eventId: string) => {
      setExpandedId((prev) => {
        const next = prev === eventId ? null : eventId;
        if (next) loadAttempts(next);
        return next;
      });
    },
    [loadAttempts],
  );

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
        .select(DETAIL_COLUMNS)
        .in('id', ids.slice(0, 200))
        .order('created_at', { ascending: false });
      setDrillRows((data ?? []) as DetailRow[]);
      setDrillLoading(false);
    },
    [rows, timeZone],
  );

  const refreshDrillRow = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('webhook_events')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (data) {
      setDrillRows((prev) =>
        prev ? prev.map((r) => (r.id === id ? (data as DetailRow) : r)) : prev,
      );
    }
  }, []);

  const runRetry = useCallback(
    async (event: DetailRow) => {
      try {
        const { data, error } = await supabase.functions.invoke('retry-webhook-event', {
          body: { webhook_event_id: event.id },
        });
        if (error) throw error;
        const result = data as { success?: boolean; error?: string; status?: number };
        setRetryResults((prev) => ({
          ...prev,
          [event.id]: {
            success: !!result?.success,
            message: result?.success
              ? `Replayed (HTTP ${result?.status ?? 200})`
              : result?.error || 'Retry failed',
          },
        }));
        await refreshDrillRow(event.id);
        await loadAttempts(event.id);
        return !!result?.success;
      } catch (err) {
        const msg = (err as Error)?.message || 'Retry failed';
        setRetryResults((prev) => ({ ...prev, [event.id]: { success: false, message: msg } }));
        return false;
      }
    },
    [refreshDrillRow],
  );

  const retryOne = useCallback(
    async (event: DetailRow) => {
      if (retryingId || bulkRetrying) return;
      setRetryingId(event.id);
      const ok = await runRetry(event);
      setRetryingId(null);
      toast({
        title: ok ? 'Retry succeeded' : 'Retry failed',
        description: ok
          ? `${event.event_type} was replayed successfully.`
          : retryResults[event.id]?.message || 'The event could not be replayed.',
        variant: ok ? undefined : 'destructive',
      });
    },
    [bulkRetrying, retryResults, retryingId, runRetry, toast],
  );

  const retryAllFailed = useCallback(async () => {
    const failed = (drillRows ?? []).filter((r) => r.status === 'failed');
    if (!failed.length || bulkRetrying || retryingId) return;
    setBulkRetrying(true);
    let succeeded = 0;
    for (let i = 0; i < failed.length; i++) {
      setBulkProgress({ done: i, total: failed.length });
      const ok = await runRetry(failed[i]);
      if (ok) succeeded++;
    }
    setBulkProgress(null);
    setBulkRetrying(false);
    toast({
      title: 'Bulk retry finished',
      description: `${succeeded} of ${failed.length} event${failed.length === 1 ? '' : 's'} replayed successfully.`,
      variant: succeeded === failed.length ? undefined : 'destructive',
    });
  }, [bulkRetrying, drillRows, retryingId, runRetry, toast]);

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

      <Dialog open={drill !== null} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {drill ? `${STATUS_LABEL[drill.status]} · ${labelFor(drill.day)}` : ''}
            </DialogTitle>
            <DialogDescription>
              {drill
                ? `Events received on ${labelFor(drill.day)} (${timeZone.replace('_', ' ')}).`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {drillLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !drillRows?.length ? (
            <p className="text-sm text-muted-foreground">No events for this day and status.</p>
          ) : (
            <div className="space-y-3">
              {drillRows.some((r) => r.status === 'failed') && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    {drillRows.filter((r) => r.status === 'failed').length} failed event
                    {drillRows.filter((r) => r.status === 'failed').length === 1 ? '' : 's'} can be
                    resent.
                    {bulkProgress
                      ? ` Retrying ${bulkProgress.done + 1} of ${bulkProgress.total}…`
                      : ''}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkRetrying || !!retryingId}
                    onClick={retryAllFailed}
                  >
                    <RefreshCw
                      className={cn('h-3.5 w-3.5 mr-1', bulkRetrying && 'animate-spin')}
                    />
                    {bulkRetrying ? 'Retrying…' : 'Retry all failed'}
                  </Button>
                </div>
              )}
              <div className="max-h-[55vh] overflow-y-auto space-y-2">
              {drillRows.map((e) => (
                <div key={e.id} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        e.status === 'processed'
                          ? 'secondary'
                          : e.status === 'failed'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {e.status}
                    </Badge>
                    <span className="font-medium">{e.event_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {drillTimeFormat.format(new Date(e.created_at))}
                    </span>
                    {e.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto h-7 px-2 text-xs"
                        disabled={bulkRetrying || !!retryingId}
                        onClick={() => retryOne(e)}
                      >
                        <RefreshCw
                          className={cn(
                            'h-3.5 w-3.5 mr-1',
                            retryingId === e.id && 'animate-spin',
                          )}
                        />
                        {retryingId === e.id ? 'Retrying…' : 'Retry'}
                      </Button>
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground break-all">{e.event_id}</p>
                  {e.error_message && (
                    <p className="text-xs text-destructive break-words">{e.error_message}</p>
                  )}
                  {retryResults[e.id] && (
                    <p
                      className={cn(
                        'flex items-center gap-1 text-xs',
                        retryResults[e.id].success ? 'text-muted-foreground' : 'text-destructive',
                      )}
                    >
                      {retryResults[e.id].success ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {retryResults[e.id].message}
                    </p>
                  )}
                </div>
              ))}
              {drillRows.length >= 200 && (
                <p className="text-xs text-muted-foreground">
                  Showing the first 200 events for this day.
                </p>
              )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
