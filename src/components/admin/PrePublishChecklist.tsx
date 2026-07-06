import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Webhook,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type Status = 'pass' | 'warn' | 'fail' | 'unknown';

interface WebhookStats {
  total: number;
  processed: number;
  failed: number;
  pending: number;
  lastProcessedAt: string | null;
  lastFailedAt: string | null;
}

const statusStyles: Record<Status, { icon: typeof CheckCircle2; badge: string; label: string }> = {
  pass: { icon: CheckCircle2, badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', label: 'Ready' },
  warn: { icon: AlertTriangle, badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30', label: 'Review' },
  fail: { icon: XCircle, badge: 'bg-red-500/15 text-red-500 border-red-500/30', label: 'Action needed' },
  unknown: { icon: AlertTriangle, badge: 'bg-muted text-muted-foreground border-border', label: 'Unknown' },
};

function StatusBadge({ status }: { status: Status }) {
  const s = statusStyles[status];
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={cn('gap-1.5 border', s.badge)}>
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </Badge>
  );
}

export default function PrePublishChecklist() {
  const [loading, setLoading] = useState(true);
  const [webhook, setWebhook] = useState<WebhookStats | null>(null);
  const [scanReviewedAt, setScanReviewedAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('webhook_events')
        .select('status, created_at, processed_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const rows = data ?? [];
      const processed = rows.filter((r) => r.status === 'processed');
      const failed = rows.filter((r) => r.status === 'failed');
      const pending = rows.filter((r) => r.status === 'pending');

      setWebhook({
        total: rows.length,
        processed: processed.length,
        failed: failed.length,
        pending: pending.length,
        lastProcessedAt: processed[0]?.processed_at ?? processed[0]?.created_at ?? null,
        lastFailedAt: failed[0]?.created_at ?? null,
      });

      // Local-only marker for the last time an admin acknowledged the security scan review.
      setScanReviewedAt(localStorage.getItem('prepublish:scanReviewedAt'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markScanReviewed = () => {
    const iso = new Date().toISOString();
    localStorage.setItem('prepublish:scanReviewedAt', iso);
    setScanReviewedAt(iso);
  };

  // ── Derive statuses ─────────────────────────────────────────────
  let webhookStatus: Status = 'unknown';
  if (webhook) {
    if (webhook.total === 0) webhookStatus = 'warn';
    else if (webhook.failed > 0) webhookStatus = 'fail';
    else if (webhook.processed > 0) webhookStatus = 'pass';
    else webhookStatus = 'warn';
  }

  let scanStatus: Status = 'warn';
  if (scanReviewedAt) {
    const ageDays = (Date.now() - new Date(scanReviewedAt).getTime()) / (1000 * 60 * 60 * 24);
    scanStatus = ageDays < 7 ? 'pass' : 'warn';
  }

  // Alerting on failed webhooks: no channel is wired up yet.
  const alertingStatus: Status = 'fail';

  const overall: Status =
    [webhookStatus, scanStatus, alertingStatus].includes('fail')
      ? 'fail'
      : [webhookStatus, scanStatus, alertingStatus].includes('warn') ||
        [webhookStatus, scanStatus, alertingStatus].includes('unknown')
      ? 'warn'
      : 'pass';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Pre-publish checklist
            </CardTitle>
            <CardDescription>
              Verify the platform is healthy before shipping a release.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={overall} />
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Security scan */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Security scan
            </CardTitle>
            <CardDescription>
              Run a fresh scan from the Lovable chat before each publish. Mark as reviewed once
              critical findings are triaged.
            </CardDescription>
          </div>
          <StatusBadge status={scanStatus} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {scanReviewedAt ? (
              <>
                Last acknowledged{' '}
                <span className="text-foreground font-medium">
                  {formatDistanceToNow(new Date(scanReviewedAt), { addSuffix: true })}
                </span>
                .
              </>
            ) : (
              <>No scan has been acknowledged in this browser yet.</>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={markScanReviewed}>
            Mark scan reviewed now
          </Button>
        </CardContent>
      </Card>

      {/* Webhook verification */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4" />
              Webhook verification (last 7 days)
            </CardTitle>
            <CardDescription>
              At least one <code className="text-xs">processed</code> event and zero{' '}
              <code className="text-xs">failed</code> events is required.
            </CardDescription>
          </div>
          <StatusBadge status={webhookStatus} />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading webhook history…
            </div>
          ) : webhook ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Total" value={webhook.total} />
              <Stat label="Processed" value={webhook.processed} tone="pass" />
              <Stat label="Failed" value={webhook.failed} tone={webhook.failed ? 'fail' : 'muted'} />
              <Stat label="Pending" value={webhook.pending} tone={webhook.pending ? 'warn' : 'muted'} />
              <div className="col-span-2 sm:col-span-4 text-xs text-muted-foreground pt-2 border-t">
                Last processed:{' '}
                <span className="text-foreground">
                  {webhook.lastProcessedAt
                    ? formatDistanceToNow(new Date(webhook.lastProcessedAt), { addSuffix: true })
                    : '—'}
                </span>
                {webhook.lastFailedAt && (
                  <>
                    {' · '}Last failure:{' '}
                    <span className="text-red-500">
                      {formatDistanceToNow(new Date(webhook.lastFailedAt), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No data.</div>
          )}
        </CardContent>
      </Card>

      {/* Alerting configuration */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" />
              Failed-webhook alerting
            </CardTitle>
            <CardDescription>
              An external alert channel (email, Slack, PagerDuty) for failed webhook events.
            </CardDescription>
          </div>
          <StatusBadge status={alertingStatus} />
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            No alert channel is wired up yet. Failures are only visible on the{' '}
            <span className="text-foreground font-medium">Webhooks</span> tab. Configure a channel
            and recipient to be notified automatically.
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Recipient: <span className="text-foreground">not set</span></li>
            <li>Channel: <span className="text-foreground">not set</span></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: number;
  tone?: 'pass' | 'warn' | 'fail' | 'muted';
}) {
  const toneClass = {
    pass: 'text-emerald-500',
    warn: 'text-amber-500',
    fail: 'text-red-500',
    muted: 'text-foreground',
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-semibold tabular-nums', toneClass)}>{value}</div>
    </div>
  );
}
