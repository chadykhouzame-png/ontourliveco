import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIMARY_DOMAIN = 'ontourlive.co';

type Status = 'pass' | 'warn' | 'fail' | 'unknown';

const statusStyles: Record<Status, { icon: typeof CheckCircle2; badge: string; label: string }> = {
  pass: { icon: CheckCircle2, badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', label: 'Ready' },
  warn: { icon: AlertTriangle, badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30', label: 'Review' },
  fail: { icon: XCircle, badge: 'bg-red-500/15 text-red-500 border-red-500/30', label: 'Action needed' },
  unknown: { icon: AlertTriangle, badge: 'bg-muted text-muted-foreground border-border', label: 'Checking' },
};

function Row({
  title,
  status,
  detail,
}: {
  title: string;
  status: Status;
  detail: string;
}) {
  const s = statusStyles[status];
  const Icon = s.icon;
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <Badge variant="outline" className={cn('gap-1.5 shrink-0 border', s.badge)}>
        <Icon className="h-3.5 w-3.5" />
        {s.label}
      </Badge>
    </div>
  );
}

export default function AdminDomainChecklist() {
  const [checking, setChecking] = useState(true);
  const [reachable, setReachable] = useState<Status>('unknown');
  const [sitemap, setSitemap] = useState<Status>('unknown');
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isPrimary = host === PRIMARY_DOMAIN || host === `www.${PRIMARY_DOMAIN}`;

  const run = useCallback(async () => {
    setChecking(true);
    setReachable('unknown');
    setSitemap('unknown');

    const ping = async (url: string): Promise<Status> => {
      try {
        await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        return 'pass';
      } catch {
        return 'fail';
      }
    };

    setReachable(await ping(`https://${PRIMARY_DOMAIN}/`));
    setSitemap(await ping(`https://${PRIMARY_DOMAIN}/sitemap.xml`));
    setChecking(false);
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const canonical =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? ''
      : '';
  const canonicalStatus: Status = canonical.includes(PRIMARY_DOMAIN) ? 'pass' : 'warn';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domain checklist — {PRIMARY_DOMAIN}
          </CardTitle>
          <CardDescription>
            Confirms the main address is serving, set as the address visitors stay on, and ready for search engines.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={run} disabled={checking}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Re-check</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <Row
          title="Address is live"
          status={reachable}
          detail={
            reachable === 'pass'
              ? `https://${PRIMARY_DOMAIN} responded over a secure connection.`
              : reachable === 'fail'
                ? `No response from https://${PRIMARY_DOMAIN}. Check the domain setup in Project Settings → Domains.`
                : 'Checking…'
          }
        />

        <Row
          title="Set as the main address"
          status={isPrimary ? 'pass' : 'warn'}
          detail={
            isPrimary
              ? `You are viewing this on ${host}, so visitors stay on the main address.`
              : `This page is being served from ${host || 'another address'}. Open Project Settings → Domains, use the three-dot menu on ${PRIMARY_DOMAIN} and choose "Set as primary", then load the admin area on ${PRIMARY_DOMAIN} to confirm.`
          }
        />

        <Row
          title="Search engine sitemap"
          status={sitemap}
          detail={
            sitemap === 'pass'
              ? `https://${PRIMARY_DOMAIN}/sitemap.xml is published and lists your pages.`
              : sitemap === 'fail'
                ? 'The sitemap could not be reached — publish the site to make it available.'
                : 'Checking…'
          }
        />

        <Row
          title="Page addresses point to the main domain"
          status={canonicalStatus}
          detail={
            canonicalStatus === 'pass'
              ? `Pages tell search engines their address is on ${PRIMARY_DOMAIN}.`
              : `Preferred page address currently reads "${canonical || 'not set on this page'}". Publish the latest changes so search engines see ${PRIMARY_DOMAIN}.`
          }
        />
      </CardContent>
    </Card>
  );
}
