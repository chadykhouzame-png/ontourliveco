import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';

type Reason = 'honeypot' | 'too_fast' | 'rate_limited' | 'invalid_body';

type Row = {
  id: string;
  reason: Reason;
  role: 'artist' | 'venue' | null;
  ip_hash: string | null;
  client_kind: string | null;
  created_at: string;
};

const REASON_LABEL: Record<Reason, string> = {
  honeypot: 'Hidden trap field filled',
  too_fast: 'Submitted too fast',
  rate_limited: 'Too many attempts',
  invalid_body: 'Malformed submission',
};

const AdminBlockedAttempts = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reason, setReason] = useState<'all' | Reason>('all');
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    const { data, error } = await supabase
      .from('waitlist_blocked_attempts')
      .select('id,reason,role,ip_hash,client_kind,created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      toast({
        title: 'Could not load blocked attempts',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (reason === 'all' ? rows : rows.filter((r) => r.reason === reason)),
    [rows, reason],
  );

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return rows.filter((r) => new Date(r.created_at).getTime() > cutoff).length;
  }, [rows]);

  const clearOld = async () => {
    setClearing(true);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('waitlist_blocked_attempts')
      .delete()
      .lt('created_at', cutoff);
    setClearing(false);
    setConfirmClear(false);
    if (error) {
      toast({ title: 'Could not clear entries', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Older entries removed' });
    load({ silent: true });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Blocked sign-up attempts
            </CardTitle>
            <CardDescription>
              {rows.length} recorded · {last24h} in the last 24 hours. Nothing typed into the form is
              stored — only why it was blocked and a scrambled, one-way fingerprint of the visitor.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={reason} onValueChange={(v) => setReason(v as 'all' | Reason)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {(Object.keys(REASON_LABEL) as Reason[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {REASON_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => load({ silent: true })}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" onClick={() => setConfirmClear(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear 30+ days
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No blocked attempts recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Claimed role</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Visitor fingerprint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.reason === 'honeypot' ? 'destructive' : 'secondary'}>
                        {REASON_LABEL[r.reason]}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{r.role ?? '—'}</TableCell>
                    <TableCell className="capitalize">{r.client_kind ?? 'unknown'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.ip_hash ? r.ip_hash.slice(0, 12) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear entries older than 30 days?</AlertDialogTitle>
            <AlertDialogDescription>
              Recent entries stay. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearOld} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminBlockedAttempts;
