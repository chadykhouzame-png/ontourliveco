import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Globe, Construction } from 'lucide-react';

const KEY = 'holding_page_enabled';

const AdminSiteMode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', KEY)
        .maybeSingle();
      if (!error && data) {
        const v = data.value as unknown;
        setEnabled(v === true || v === 'true');
      }
      setLoading(false);
    })();
  }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    const prev = enabled;
    setEnabled(next);
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key: KEY, value: next as unknown as any, updated_at: new Date().toISOString(), updated_by: user?.id ?? null },
        { onConflict: 'key' }
      );
    setSaving(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? <Construction className="h-5 w-5 text-primary" /> : <Globe className="h-5 w-5 text-primary" />}
          Site mode
        </CardTitle>
        <CardDescription>
          Switch what visitors see at the root URL — no redeploy needed. The waitlist page is always
          reachable at <code>/waitlist</code>, and the full app home is always reachable at <code>/home</code>.
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
            {(loading || saving) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="holding-toggle"
              checked={enabled}
              disabled={loading || saving}
              onCheckedChange={toggle}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSiteMode;
