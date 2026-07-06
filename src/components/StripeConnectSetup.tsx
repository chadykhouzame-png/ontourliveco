import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectStatusProps {
  artistId: string;
}

interface ConnectStatus {
  has_account: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export const StripeConnectSetup = ({ artistId }: StripeConnectStatusProps) => {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (error) throw error;
      setStatus(data);
    } catch (err) {
      console.error('Error checking connect status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Re-check status when returning from Stripe onboarding. The visible
  // confirmation is rendered by <StripeReturnBanner /> in ArtistDashboard;
  // this hook only refreshes the account status data. URL cleanup is handled
  // by the banner when the user dismisses it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'complete') {
      checkStatus();
    }
  }, [checkStatus]);

  const handleSetupStripe = async () => {
    setIsOnboarding(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to start Stripe setup', variant: 'destructive' });
    } finally {
      setIsOnboarding(false);
    }
  };

  const handleViewDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-dashboard');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to open Stripe dashboard', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card className="glass border-border/50 rounded-2xl">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Payment Setup
        </CardTitle>
        <CardDescription>
          Set up your payment account to receive booking payments
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {status?.onboarding_complete ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Payments active</p>
                <p className="text-sm text-muted-foreground">You can receive booking payments</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleViewDashboard} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Stripe Dashboard
            </Button>
          </div>
        ) : status?.has_account ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Setup incomplete</p>
                <p className="text-sm text-muted-foreground">Complete your Stripe onboarding to receive payments</p>
              </div>
            </div>
            <Button onClick={handleSetupStripe} disabled={isOnboarding} className="w-full">
              {isOnboarding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              Complete Setup
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to receive payments directly when venues book you. We take a 5% platform fee.
            </p>
            <Button onClick={handleSetupStripe} disabled={isOnboarding} className="w-full bg-primary">
              {isOnboarding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Set Up Payments
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StripeConnectSetup;
