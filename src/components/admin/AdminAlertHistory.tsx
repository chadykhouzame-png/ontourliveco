import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { History, Check, CheckCheck, RefreshCw } from 'lucide-react';

type AlertRow = {
  id: string;
  source: string;
  stage: string;
  event_id: string | null;
  event_type: string | null;
  error_message: string;
  burst_count: number;
  notified: boolean;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
};

type Filter = 'all' | 'open' | 'acknowledged' | 'resolved';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Needs attention' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'resolved', label: 'Resolved' },
];

function statusOf(a: AlertRow): Filter {
  if (a.resolved_at) return 'resolved';
  if (a.acknowledged_at) return 'acknowledged';
  return 'open';
}

export default function AdminAlertHistory() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');
  const [resolving, setResolving] = useState<AlertRow | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('webhook_failure_alerts')
      .select(
        'id, source, stage, event_id, event_type, error_message, burst_count, notified, created_at, acknowledged_at, resolved_at, resolution_note'
      )
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data ?? []) as AlertRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => statusOf(r) === filter)),
    [rows, filter]
  );

  const counts = useMemo(
    () => ({
      open: rows.filter((r) => statusOf(r) === 'open').length,
      acknowledged: rows.filter((r) => statusOf(r) === 'acknowledged').length,
      resolved: rows.filter((r) => statusOf(r) === 'resolved').length,
    }),
    [rows]
  );

  const acknowledge = async (row: AlertRow) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('webhook_failure_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userData.user?.id ?? null,
      })
      .eq('id', row.id);
    if (error) {
      toast({
        title: 'Could not acknowledge',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Marked as acknowledged' });
    load();
  };

  const resolve = async () => {
    if (!resolving) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('webhook_failure_alerts')
      .update({
        acknowledged_at: resolving.acknowledged_at ?? now,
        acknowledged_by: resolving.acknowledged_at ? undefined : userData.user?.id ?? null,
        resolved_at: now,
        resolved_by: userData.user?.id ?? null,
        resolution_note: note.trim() || null,
      })
      .eq('id', resolving.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not resolve', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marked as resolved' });
    setResolving(null);
    setNote('');
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Alert history
          </CardTitle>
          <CardDescription>
            Every repeated-failure alert, and how it was handled. {counts.open} need attention ·{' '}
            {counts.acknowledged} acknowledged · {counts.resolved} resolved.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : 'Nothing here right now.'}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {filtered.map((a) => {
              const status = statusOf(a);
              return (
                <li key={a.id} className="px-4 py-3 text-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {a.source} · {a.stage}
                      {a.event_type ? ` · ${a.event_type}` : ''}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          status === 'resolved'
                            ? 'secondary'
                            : status === 'acknowledged'
                              ? 'outline'
                              : 'destructive'
                        }
                      >
                        {status === 'open'
                          ? 'needs attention'
                          : status === 'acknowledged'
                            ? 'acknowledged'
                            : 'resolved'}
                      </Badge>
                      {a.notified && <Badge variant="outline">emailed</Badge>}
                      {a.burst_count > 1 && (
                        <Badge variant="outline">{a.burst_count} in burst</Badge>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground break-words">{a.error_message}</p>

                  <p className="text-xs text-muted-foreground">
                    Failed {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} (
                    {format(new Date(a.created_at), 'd MMM yyyy, h:mm a')})
                    {a.acknowledged_at &&
                      ` · acknowledged ${format(new Date(a.acknowledged_at), 'd MMM, h:mm a')}`}
                    {a.resolved_at &&
                      ` · resolved ${format(new Date(a.resolved_at), 'd MMM, h:mm a')}`}
                  </p>

                  {a.resolution_note && (
                    <p className="text-xs rounded-md border bg-muted/40 px-3 py-2 break-words">
                      {a.resolution_note}
                    </p>
                  )}

                  {status !== 'resolved' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => acknowledge(a)}>
                          <Check className="h-4 w-4 mr-2" /> Acknowledge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => {
                          setResolving(a);
                          setNote('');
                        }}
                      >
                        <CheckCheck className="h-4 w-4 mr-2" /> Mark resolved
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!resolving} onOpenChange={(open) => !open && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark this alert resolved</DialogTitle>
            <DialogDescription>
              Add a short note about what you did, so the history explains how it was handled.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Retried the failed events, booking now confirmed."
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={resolve} disabled={saving}>
              {saving ? 'Saving…' : 'Mark resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
