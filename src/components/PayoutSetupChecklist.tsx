import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  ExternalLink,
  AlertCircle,
  Webhook,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ChecklistState {
  account_created: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  webhook_received: boolean;
  webhook_event_id: string | null;
  webhook_received_at: string | null;
  webhook_status: string | null;
  stripe_account_id: string | null;
  onboarding_complete: boolean;
}

interface Props {
  onComplete?: () => void;
}

const stepDef = [
  { key: 'account_created', label: 'Stripe Connect account created' },
  { key: 'details_submitted', label: 'Onboarding details submitted' },
  { key: 'charges_enabled', label: 'Charges enabled' },
  { key: 'payouts_enabled', label: 'Payouts enabled' },
] as const;

export const PayoutSetupChecklist = ({ onComplete }: Props) => {
  const [state, setState] = useState<ChecklistState | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [starting, setStarting] = useState(false);
  const { toast } = useToast();

  const verify = useCallback(
    async (opts?: { silent?: boolean }) => {
      setVerifying(true);
      try {
        const { data, error } = await supabase.functions.invoke('verify-payout-setup');
        if (error) throw error;
        setState(data);
        if (!opts?.silent) {
          if (data.onboarding_complete && data.webhook_received) {
            toast({
              title: 'Payouts ready',
              description: 'Stripe onboarding is complete and the account.updated webhook was received.',
            });
            onComplete?.();
          } else if (data.onboarding_complete && !data.webhook_received) {
            toast({
              title: 'Onboarding complete — webhook missing',
              description:
                'Stripe says the account is live, but no account.updated event was logged. Check your webhook endpoint.',
              variant: 'destructive',
            });
          } else if (data.account_created) {
            toast({
              title: 'Setup incomplete',
              description: 'Finish the remaining steps and click Verify again.',
            });
          }
        }
      } catch (err) {
        toast({
          title: 'Verification failed',
          description: (err as Error).message,
          variant: 'destructive',
        });
      } finally {
        setVerifying(false);
      }
    },
    [toast, onComplete],
  );

  useEffect(() => {
    verify({ silent: true });
  }, [verify]);

  const startOnboarding = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      toast({
        title: 'Could not start Stripe onboarding',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setStarting(false);
    }
  };

  const stepIcon = (done: boolean) =>
    done ? (
      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
    ) : (
      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
    );

  const allDone = state?.onboarding_complete && state?.webhook_received;

  return (
    <Card className="glass border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          Set up payouts
        </CardTitle>
        <CardDescription>
          One-click checklist that verifies the <code className="text-xs">account.updated</code> webhook fired after
          Stripe Connect onboarding.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <ul className="space-y-2">
          {stepDef.map((s) => (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              {stepIcon(!!state?.[s.key])}
              <span className={state?.[s.key] ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
            </li>
          ))}
          <li className="flex items-start gap-3 text-sm pt-1 border-t border-border/30 mt-2">
            <div className="pt-0.5">{stepIcon(!!state?.webhook_received)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Webhook className="w-4 h-4 text-muted-foreground" />
                <span className={state?.webhook_received ? 'text-foreground' : 'text-muted-foreground'}>
                  <code className="text-xs">account.updated</code> webhook received
                </span>
                {state?.webhook_status && (
                  <Badge
                    variant={state.webhook_status === 'processed' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {state.webhook_status}
                  </Badge>
                )}
              </div>
              {state?.webhook_received && state.webhook_received_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(state.webhook_received_at), { addSuffix: true })} ·{' '}
                  <span className="font-mono">{state.webhook_event_id}</span>
                </p>
              )}
              {state?.account_created && !state.webhook_received && (
                <p className="text-xs text-muted-foreground mt-1">
                  No event logged yet for account{' '}
                  <span className="font-mono">{state.stripe_account_id}</span>. Stripe usually fires
                  this within seconds of onboarding submission.
                </p>
              )}
            </div>
          </li>
        </ul>

        {allDone ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-success dark:text-success">Payouts are ready</p>
              <p className="text-sm text-muted-foreground">
                You'll receive payouts automatically after each booking.
              </p>
            </div>
          </div>
        ) : state?.account_created ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Finish onboarding in Stripe, then click <span className="font-medium">Verify</span>. We'll re-check
              Stripe and confirm the webhook landed in your database.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 border border-border/40">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              You don't have a Stripe Connect account yet. Start onboarding to enable payouts.
            </p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!state?.account_created && (
            <Button onClick={startOnboarding} disabled={starting} className="flex-1">
              {starting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Start Stripe onboarding
            </Button>
          )}
          {state?.account_created && !allDone && (
            <Button onClick={startOnboarding} disabled={starting} variant="outline" className="flex-1">
              {starting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Continue in Stripe
            </Button>
          )}
          <Button
            onClick={() => verify()}
            disabled={verifying}
            className={allDone || !state?.account_created ? '' : 'flex-1'}
            variant={allDone ? 'outline' : 'default'}
          >
            {verifying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {allDone ? 'Re-verify' : 'Verify setup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutSetupChecklist;
