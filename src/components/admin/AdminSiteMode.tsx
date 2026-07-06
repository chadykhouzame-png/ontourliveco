import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Globe, Construction, Clock } from 'lucide-react';

const HOLDING_KEY = 'holding_page_enabled';
const LAUNCH_KEY = 'launch_date';

// Convert an ISO UTC string to the "YYYY-MM-DDTHH:mm" value a
// datetime-local input expects, in the browser's local timezone.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const AdminSiteMode = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingHolding, setSavingHolding] = useState(false);
  const [savingLaunch, setSavingLaunch] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [launchIso, setLaunchIso] = useState<string | null>(null);
  const [launchInput, setLaunchInput] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [HOLDING_KEY, LAUNCH_KEY]);
      if (data) {
        for (const row of data) {
          if (row.key === HOLDING_KEY) {
            const v = row.value as unknown;
            setEnabled(v === true || v === 'true');
          }
          if (row.key === LAUNCH_KEY) {
            const v = typeof row.value === 'string' ? row.value : null;
            setLaunchIso(v);
            setLaunchInput(isoToLocalInput(v));
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const tzLabel = useMemo(
    () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'your local timezone',
    []
  );

  const toggleHolding = async (next: boolean) => {
    setSavingHolding(true);
    const prev = enabled;
    setEnabled(next);
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key: HOLDING_KEY,
          value: next as unknown as any,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: 'key' }
      );
    setSavingHolding(false);
    if (error) {
      setEnabled(prev);
      toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: next ? 'Holding page enabled' : 'Full website enabled',
      description: next
        ? 'Visitors to the root URL now see the waitlist landing.'
        : 'Visitors to the root URL now see the full app home.',
    });
  };

  const saveLaunch = async () => {
    if (!launchInput) {
      toast({ title: 'Pick a date and time', variant: 'destructive' });
      return;
    }
    const parsed = new Date(launchInput);
    if (Number.isNaN(parsed.getTime())) {
      toast({ title: 'Invalid date', variant: 'destructive' });
      return;
    }
    setSavingLaunch(true);
    const iso = parsed.toISOString();
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          key: LAUNCH_KEY,
          value: iso as unknown as any,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: 'key' }
      );
    setSavingLaunch(false);
    if (error) {
      toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
      return;
    }
    setLaunchIso(iso);
    toast({ title: 'Launch date updated', description: parsed.toLocaleString() });
  };

  const clearLaunch = async () => {
    setSavingLaunch(true);
    const { error } = await supabase.from('site_settings').delete().eq('key', LAUNCH_KEY);
    setSavingLaunch(false);
    if (error) {
      toast({ title: 'Could not clear', description: error.message, variant: 'destructive' });
      return;
    }
    setLaunchIso(null);
    setLaunchInput('');
    toast({ title: 'Countdown hidden' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {enabled ? (
              <Construction className="h-5 w-5 text-primary" />
            ) : (
              <Globe className="h-5 w-5 text-primary" />
            )}
            Site mode
          </CardTitle>
          <CardDescription>
            Switch what visitors see at the root URL — no redeploy needed. The waitlist page is
            always reachable at <code>/waitlist</code>, and the full app home is always reachable at{' '}
            <code>/home</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-1">
              <Label htmlFor="holding-toggle" className="text-base font-medium">
                Show holding page at /
              </Label>
              <p className="text-sm text-muted-foreground">
                When off, <code>/</code> serves the full website.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(loading || savingHolding) && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                id="holding-toggle"
                checked={enabled}
                disabled={loading || savingHolding}
                onCheckedChange={toggleHolding}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Launch countdown
          </CardTitle>
          <CardDescription>
            Set the date the holding-page countdown targets. Times are entered in {tzLabel} and
            stored in UTC. Clear the date to hide the countdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="launch-date">Launch date & time</Label>
              <Input
                id="launch-date"
                type="datetime-local"
                value={launchInput}
                onChange={(e) => setLaunchInput(e.target.value)}
                disabled={loading || savingLaunch}
              />
            </div>
            <Button onClick={saveLaunch} disabled={loading || savingLaunch}>
              {savingLaunch ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={clearLaunch}
              disabled={loading || savingLaunch || !launchIso}
            >
              Clear
            </Button>
          </div>
          {launchIso && (
            <p className="text-sm text-muted-foreground">
              Currently counting down to{' '}
              <span className="font-medium text-foreground">
                {new Date(launchIso).toLocaleString()}
              </span>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSiteMode;
