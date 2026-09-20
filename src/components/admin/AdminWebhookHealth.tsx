import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Activity, BellRing, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

type EventRow = {
  id: string;
  event_id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

type Health = {
  total24h: number;
  total7d: number;
  failed24h: number;
  failed7d: number;
  pending: number;
  lastEvent: EventRow | null;
  lastFailure: EventRow | null;
  recent: EventRow[];
};

const statusVariant = (status: string) =>
  status === 'processed' ? 'secondary' : status === 'failed' ? 'destructive' : 'outline';

const AdminWebhookHealth = () => {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertsConfigured, setAlertsConfigured] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('webhook_events')
      .select('id, event_id, event_type, status, error_message, created_at, processed_at')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(500);

    const rows = (data ?? []) as EventRow[];
    const in24h = rows.filter((r) => r.created_at >= since24h);

    const { data: latest } = await supabase
      .from('webhook_events')
      .select('id, event_id, event_type, status, error_message, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: lastFail } = await supabase
      .from('webhook_events')
      .select('id, event_id, event_type, status, error_message, created_at, processed_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1);

    setHealth({
      total24h: in24h.length,
      total7d: rows.length,
      failed24h: in24h.filter((r) => r.status === 'failed').length,
      failed7d: rows.filter((r) => r.status === 'failed').length,
      pending: rows.filter((r) => r.status !== 'processed' && r.status !== 'failed').length,
      lastEvent: ((latest ?? [])[0] as EventRow) ?? null,
      lastFailure: ((lastFail ?? [])[0] as EventRow) ?? null,
      recent: rows.slice(0, 8),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    supabase.functions
      .invoke('send-webhook-failure-alert', { body: { ping: true } })
      .then(({ error }) => {
        if (active) setAlertsConfigured(!error);
      })
      .catch(() => active && setAlertsConfigured(false));
    return () => {
      active = false;
    };
  }, []);

  const successRate =
    health && health.total7d > 0
      ? Math.round(((health.total7d - health.failed7d) / health.total7d) * 100)
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Webhook health
          </CardTitle>
          <CardDescription>Delivery volume, failures and alerting status</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading || !health ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Last 24 hours</p>
                <p className="text-2xl font-semibold">{health.total24h}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Last 7 days</p>
                <p className="text-2xl font-semibold">{health.total7d}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Failed (7 days)</p>
                <p
                  className={`text-2xl font-semibold ${
                    health.failed7d > 0 ? 'text-destructive' : ''
                  }`}
                >
                  {health.failed7d}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Success rate</p>
                <p className="text-2xl font-semibold">
                  {successRate === null ? '—' : `${successRate}%`}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-sm font-medium">Last event received</p>
                {health.lastEvent ? (
                  <p className="text-sm text-muted-foreground">
                    {health.lastEvent.event_type} ·{' '}
                    {formatDistanceToNow(new Date(health.lastEvent.created_at), { addSuffix: true })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No events recorded yet</p>
                )}
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <BellRing className="h-4 w-4" /> Failure alerts
                </p>
                <p className="text-sm text-muted-foreground">
                  {alertsConfigured === null
                    ? 'Checking…'
                    : alertsConfigured
                      ? 'Email alerts to admins are active'
                      : 'Alerting unavailable — check email settings'}
                </p>
              </div>
            </div>

            {health.lastFailure && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" /> Most recent failure
                </p>
                <p className="text-sm mt-1">
                  {health.lastFailure.event_type} ·{' '}
                  {formatDistanceToNow(new Date(health.lastFailure.created_at), { addSuffix: true })}
                </p>
                {health.lastFailure.error_message && (
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {health.lastFailure.error_message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Recent deliveries</p>
              {health.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in the last 7 days.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {health.recent.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                    >
                      <span className="truncate">{row.event_type}</span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                        </span>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminWebhookHealth;
