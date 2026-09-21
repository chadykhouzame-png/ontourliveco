import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BellRing, Play, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type Metric = 'failure_rate' | 'processing_time' | 'pending_count';

type Rule = {
  id: string;
  metric: Metric;
  enabled: boolean;
  threshold: number;
  window_minutes: number;
  min_events: number;
  cooldown_minutes: number;
  notify_email: boolean;
  last_triggered_at: string | null;
  last_checked_at: string | null;
  last_value: number | null;
};

const META: Record<Metric, { title: string; description: string; unit: string; minLabel: string }> = {
  failure_rate: {
    title: 'Failure rate',
    description: 'Alert when the share of failed payment events climbs above your limit.',
    unit: '%',
    minLabel: 'Minimum events before alerting',
  },
  processing_time: {
    title: 'Processing time',
    description: 'Alert when events take longer than usual to finish processing.',
    unit: 'seconds',
    minLabel: 'Minimum processed events before alerting',
  },
  pending_count: {
    title: 'Pending events',
    description: 'Alert when unprocessed events pile up in the window.',
    unit: 'events',
    minLabel: 'Minimum pending events before alerting',
  },
};

const ORDER: Metric[] = ['failure_rate', 'processing_time', 'pending_count'];

const AdminAlertRules = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhook_alert_rules')
      .select('*');
    if (error) {
      toast({ title: 'Could not load alert settings', description: error.message, variant: 'destructive' });
    } else {
      const rows = (data ?? []) as unknown as Rule[];
      setRules([...rows].sort((a, b) => ORDER.indexOf(a.metric) - ORDER.indexOf(b.metric)));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, changes: Partial<Rule>) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const save = async (rule: Rule) => {
    setSaving(rule.id);
    const { error } = await supabase
      .from('webhook_alert_rules')
      .update({
        enabled: rule.enabled,
        threshold: rule.threshold,
        window_minutes: rule.window_minutes,
        min_events: rule.min_events,
        cooldown_minutes: rule.cooldown_minutes,
        notify_email: rule.notify_email,
      })
      .eq('id', rule.id);
    setSaving(null);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Alert settings saved', description: META[rule.metric].title });
  };

  const runCheck = async () => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke('evaluate-webhook-alerts', { body: {} });
    setChecking(false);
    if (error) {
      toast({ title: 'Check failed', description: error.message, variant: 'destructive' });
      return;
    }
    const results = (data as { results?: Array<{ breached: boolean; alerted: boolean }> })?.results ?? [];
    const breached = results.filter((r) => r.breached).length;
    toast({
      title: breached ? `${breached} alert${breached > 1 ? 's' : ''} triggered` : 'All clear',
      description: breached
        ? 'Details are in the alert history below.'
        : 'No thresholds were exceeded.',
    });
    load();
  };

  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4" /> Alert thresholds
          </CardTitle>
          <CardDescription>
            Choose when you get emailed about failure rates, slow processing and pending events.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={runCheck} disabled={checking}>
          <Play className="mr-2 h-4 w-4" />
          {checking ? 'Checking…' : 'Check now'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : (
          rules.map((rule) => {
            const meta = META[rule.metric];
            return (
              <div key={rule.id} className="rounded-lg border p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{meta.title}</h4>
                      {!rule.enabled && <Badge variant="outline">off</Badge>}
                      {rule.last_value !== null && (
                        <Badge variant="secondary">
                          now {rule.last_value}
                          {rule.metric === 'failure_rate' ? '%' : rule.metric === 'processing_time' ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{meta.description}</p>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => patch(rule.id, { enabled: v })}
                    aria-label={`Enable ${meta.title} alerts`}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor={`th-${rule.id}`}>Alert above ({meta.unit})</Label>
                    <Input
                      id={`th-${rule.id}`}
                      type="number"
                      min={0}
                      value={rule.threshold}
                      onChange={(e) => patch(rule.id, { threshold: num(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`win-${rule.id}`}>Look back (minutes)</Label>
                    <Input
                      id={`win-${rule.id}`}
                      type="number"
                      min={5}
                      max={1440}
                      value={rule.window_minutes}
                      onChange={(e) => patch(rule.id, { window_minutes: num(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`min-${rule.id}`}>{meta.minLabel}</Label>
                    <Input
                      id={`min-${rule.id}`}
                      type="number"
                      min={0}
                      value={rule.min_events}
                      onChange={(e) => patch(rule.id, { min_events: num(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`cd-${rule.id}`}>Wait between alerts (minutes)</Label>
                    <Input
                      id={`cd-${rule.id}`}
                      type="number"
                      min={5}
                      max={1440}
                      value={rule.cooldown_minutes}
                      onChange={(e) => patch(rule.id, { cooldown_minutes: num(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={rule.notify_email}
                      onCheckedChange={(v) => patch(rule.id, { notify_email: v })}
                      aria-label={`Email me about ${meta.title}`}
                    />
                    Email me when this triggers
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {rule.last_triggered_at
                        ? `Last alert ${formatDistanceToNow(new Date(rule.last_triggered_at), { addSuffix: true })}`
                        : 'Never triggered'}
                      {rule.last_checked_at
                        ? ` · checked ${formatDistanceToNow(new Date(rule.last_checked_at), { addSuffix: true })}`
                        : ''}
                    </span>
                    <Button size="sm" onClick={() => save(rule)} disabled={saving === rule.id}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving === rule.id ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAlertRules;
