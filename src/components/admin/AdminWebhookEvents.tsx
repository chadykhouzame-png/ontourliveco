import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown, ChevronUp, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const runWebhookTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-stripe-webhook');
      if (error) throw error;
      setTestResult(data as TestResult);
      if (data?.success) {
        toast({ title: 'Webhook test passed', description: `Endpoint responded ${data.status} in ${data.duration_ms}ms` });
        // Refresh events list to show the new test event
        setTimeout(fetchEvents, 500);
      } else {
        toast({ title: 'Webhook test failed', description: data?.error || `Status ${data?.status}`, variant: 'destructive' });
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to run test';
      setTestResult({ success: false, error: msg });
      toast({ title: 'Test error', description: msg, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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
          <p className="text-muted-foreground text-center py-8">No webhook events recorded yet.</p>
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
                    <TableCell>
                      {expandedId === event.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                          <div>
                            <span className="text-xs font-semibold">Payload:</span>
                            <pre className="mt-1 text-xs bg-background rounded-lg p-3 overflow-auto max-h-48 border">
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
