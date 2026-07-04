import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  X,
  RotateCw,
  Copy,
  Download,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useWebhookTest } from './WebhookTestContext';

interface TestResult {
  success: boolean;
  status?: number;
  duration_ms?: number;
  event_id?: string;
  event_type?: string;
  response_body?: string;
  error?: string;
}

interface WebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  status: string;
  payload: any;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

interface RetryResult {
  success: boolean;
  status?: number;
  duration_ms?: number;
  retry_event_id?: string;
  original_event_id?: string;
  response_body?: string;
  error?: string;
}

const STATUS_OPTIONS = ['received', 'processing', 'processed', 'failed'];

const statusVariant = (status: string) => {
  switch (status) {
    case 'processed': return 'default';
    case 'failed': return 'destructive';
    case 'received': return 'secondary';
    default: return 'outline';
  }
};

const AdminWebhookEvents = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryResults, setRetryResults] = useState<Record<string, RetryResult>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [knownTypes, setKnownTypes] = useState<string[]>([]);

  const { toast } = useToast();
  const { setLastResult } = useWebhookTest();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('event_type', typeFilter);
    if (dateFrom) query = query.gte('created_at', dateFrom.toISOString());
    if (dateTo) {
      // Include the entire selected day
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setEvents(data);
      // Grow known-types list from any results we see
      setKnownTypes((prev) => {
        const merged = new Set(prev);
        data.forEach((e) => merged.add(e.event_type));
        return Array.from(merged).sort();
      });
    }
    setLoading(false);
  }, [statusFilter, typeFilter, dateFrom, dateTo]);

  // Seed the event-type dropdown with distinct types from the DB on first load
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('webhook_events')
        .select('event_type')
        .order('event_type', { ascending: true })
        .limit(500);
      if (data) {
        setKnownTypes(Array.from(new Set(data.map((r) => r.event_type))).sort());
      }
    })();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const runWebhookTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-stripe-webhook');
      if (error) throw error;
      const result = data as TestResult;
      setTestResult(result);
      setLastResult({ ...result, ranAt: Date.now() });
      if (result?.success) {
        toast({ title: 'Webhook test passed', description: `Endpoint responded ${result.status} in ${result.duration_ms}ms` });
        setTimeout(fetchEvents, 500);
      } else {
        toast({ title: 'Webhook test failed', description: result?.error || `Status ${result?.status}`, variant: 'destructive' });
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to run test';
      const failed = { success: false, error: msg };
      setTestResult(failed);
      setLastResult({ ...failed, ranAt: Date.now() });
      toast({ title: 'Test error', description: msg, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const copyPayload = async (event: WebhookEvent) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event.payload, null, 2));
      toast({ title: 'Payload copied', description: `${event.event_type} · ${event.event_id}` });
    } catch (err: any) {
      toast({ title: 'Copy failed', description: err?.message || 'Clipboard unavailable', variant: 'destructive' });
    }
  };

  const downloadPayload = (event: WebhookEvent) => {
    const blob = new Blob([JSON.stringify(event.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.event_type}_${event.event_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const retryEvent = async (event: WebhookEvent) => {
    setRetryingId(event.id);
    try {
      const { data, error } = await supabase.functions.invoke('retry-webhook-event', {
        body: { webhook_event_id: event.id },
      });
      if (error) throw error;
      const result = data as RetryResult;
      setRetryResults((prev) => ({ ...prev, [event.id]: result }));
      setExpandedId(event.id);
      if (result.success) {
        toast({
          title: 'Retry succeeded',
          description: `Replayed ${event.event_type} — HTTP ${result.status} in ${result.duration_ms}ms`,
        });
        setTimeout(fetchEvents, 500);
      } else {
        toast({
          title: 'Retry failed',
          description: result.error || `Status ${result.status}`,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to retry event';
      setRetryResults((prev) => ({ ...prev, [event.id]: { success: false, error: msg } }));
      toast({ title: 'Retry error', description: msg, variant: 'destructive' });
    } finally {
      setRetryingId(null);
    }
  };

  const filtersActive = useMemo(
    () => statusFilter !== 'all' || typeFilter !== 'all' || !!dateFrom || !!dateTo,
    [statusFilter, typeFilter, dateFrom, dateTo],
  );

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle>Webhook Events</CardTitle>
          <CardDescription>Stripe webhook event audit log</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={runWebhookTest} disabled={testing}>
            <Zap className={`h-4 w-4 mr-2 ${testing ? 'animate-pulse' : ''}`} />
            {testing ? 'Testing…' : 'Send Test Event'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Event type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {knownTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-9 w-[170px] justify-start text-left font-normal',
                    !dateFrom && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'PP') : 'Any'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(d) => (dateTo ? d > dateTo : false)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-9 w-[170px] justify-start text-left font-normal',
                    !dateTo && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'PP') : 'Any'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(d) => (dateFrom ? d < dateFrom : false)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground self-center">
            {loading ? 'Loading…' : `${events.length} event${events.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {testResult && (
          <div
            className={`mb-4 p-3 rounded-lg border flex items-start gap-3 ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-destructive/10 border-destructive/30'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-medium">
                {testResult.success ? 'Test event delivered successfully' : 'Test event failed'}
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                {testResult.status !== undefined && <div>HTTP status: {testResult.status}</div>}
                {testResult.duration_ms !== undefined && <div>Duration: {testResult.duration_ms}ms</div>}
                {testResult.event_id && <div className="font-mono truncate">Event: {testResult.event_id}</div>}
                {testResult.event_type && <div>Type: {testResult.event_type}</div>}
                {testResult.error && <div className="text-destructive">Error: {testResult.error}</div>}
                {testResult.response_body && (
                  <div className="font-mono break-all">Response: {testResult.response_body}</div>
                )}
              </div>
            </div>
          </div>
        )}
        {events.length === 0 && !loading ? (
          <p className="text-muted-foreground text-center py-8">
            {filtersActive ? 'No webhook events match these filters.' : 'No webhook events recorded yet.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Type</TableHead>
                <TableHead>Event ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <>
                  <TableRow key={event.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}>
                    <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[180px] truncate">{event.event_id}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {event.processed_at ? format(new Date(event.processed_at), 'MMM d, HH:mm:ss') : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 justify-end">
                        {event.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retryingId === event.id}
                            onClick={() => retryEvent(event)}
                          >
                            <RotateCw
                              className={`h-3.5 w-3.5 mr-1 ${retryingId === event.id ? 'animate-spin' : ''}`}
                            />
                            {retryingId === event.id ? 'Retrying…' : 'Retry'}
                          </Button>
                        )}
                        {expandedId === event.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === event.id && (
                    <TableRow key={`${event.id}-detail`}>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="space-y-2 py-2">
                          {event.error_message && (
                            <div>
                              <span className="text-xs font-semibold text-destructive">Error: </span>
                              <span className="text-xs text-destructive">{event.error_message}</span>
                            </div>
                          )}
                          {retryResults[event.id] && (
                            <div
                              className={`p-2 rounded-md border text-xs flex items-start gap-2 ${
                                retryResults[event.id].success
                                  ? 'bg-green-500/10 border-green-500/30'
                                  : 'bg-destructive/10 border-destructive/30'
                              }`}
                            >
                              {retryResults[event.id].success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="font-medium">
                                  {retryResults[event.id].success ? 'Retry delivered' : 'Retry failed'}
                                </div>
                                {retryResults[event.id].status !== undefined && (
                                  <div className="text-muted-foreground">HTTP status: {retryResults[event.id].status}</div>
                                )}
                                {retryResults[event.id].duration_ms !== undefined && (
                                  <div className="text-muted-foreground">Duration: {retryResults[event.id].duration_ms}ms</div>
                                )}
                                {retryResults[event.id].retry_event_id && (
                                  <div className="font-mono truncate">Replay event: {retryResults[event.id].retry_event_id}</div>
                                )}
                                {retryResults[event.id].error && (
                                  <div className="text-destructive">Error: {retryResults[event.id].error}</div>
                                )}
                                {retryResults[event.id].response_body && (
                                  <div className="font-mono break-all">Response: {retryResults[event.id].response_body}</div>
                                )}
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className="text-xs font-semibold">Payload:</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => copyPayload(event)}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => downloadPayload(event)}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download JSON
                                </Button>
                              </div>
                            </div>
                            <pre className="text-xs bg-background rounded-lg p-3 overflow-auto max-h-48 border">
                              {JSON.stringify(event.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminWebhookEvents;
