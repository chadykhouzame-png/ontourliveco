import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, RefreshCw, Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Flag = {
  severity: 'critical' | 'warning' | 'info';
  reason: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number | null;
  currency: string | null;
  paid_at: string | null;
  livemode: boolean;
  booking_request_id: string | null;
  booking_status: string | null;
  booking_payment_status: string | null;
  requested_date: string | null;
};

type Result = {
  days: number;
  checked_payments: number;
  flagged: number;
  critical: number;
  flags: Flag[];
  checked_at: string;
};

const severityVariant = (s: Flag['severity']) =>
  s === 'critical' ? 'destructive' : s === 'warning' ? 'secondary' : 'outline';

const money = (amount: number | null, currency: string | null) =>
  amount == null ? '—' : `${(amount / 100).toFixed(2)} ${(currency ?? '').toUpperCase()}`;

const AdminPaymentReconciliation = () => {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const { toast } = useToast();

  const run = async (window: number) => {
    setLoading(true);
    setDays(window);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-payments', {
        body: { days: window },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Reconciliation failed');
      setResult(data as Result);
    } catch (e) {
      toast({
        title: 'Could not compare payments',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Payment reconciliation
            </CardTitle>
            <CardDescription>
              Compares recent Stripe payments with booking records and flags money that was taken
              while the booking is still unconfirmed.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map((w) => (
              <Button
                key={w}
                size="sm"
                variant={days === w && result ? 'default' : 'outline'}
                disabled={loading}
                onClick={() => run(w)}
              >
                {loading && days === w ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  `${w} days`
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && !loading && (
          <p className="text-sm text-muted-foreground">
            Pick a time window to check payments against bookings.
          </p>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Payments checked</p>
                <p className="text-2xl font-semibold">{result.checked_payments}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Flagged</p>
                <p className="text-2xl font-semibold">{result.flagged}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Unconfirmed but paid</p>
                <p className="text-2xl font-semibold text-destructive">{result.critical}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Last checked</p>
                <p className="text-sm font-medium">
                  {format(new Date(result.checked_at), 'd MMM, HH:mm')}
                </p>
              </div>
            </div>

            {result.critical > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                <p className="text-sm">
                  {result.critical} payment{result.critical === 1 ? ' has' : 's have'} gone through
                  at Stripe without the booking being marked as paid. Retry the matching event under
                  Webhooks, or contact the venue.
                </p>
              </div>
            )}

            {result.flags.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Every payment in the last {result.days} days matches a confirmed booking.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.flags.map((f) => (
                      <TableRow key={`${f.stripe_session_id}-${f.reason}`}>
                        <TableCell>
                          <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {f.paid_at ? format(new Date(f.paid_at), 'd MMM, HH:mm') : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {money(f.amount, f.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={f.livemode ? 'default' : 'outline'}>
                            {f.livemode ? 'Live' : 'Test'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {f.booking_request_id ? (
                            <span className="font-mono text-xs">
                              {f.booking_request_id.slice(0, 8)}
                              <span className="ml-2 font-sans text-muted-foreground">
                                {f.booking_status ?? 'unknown'} / {f.booking_payment_status ?? 'none'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No match</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{f.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPaymentReconciliation;
