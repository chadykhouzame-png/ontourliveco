import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PayBookingButtonProps {
  bookingId: string;
  amount: number;
  paymentStatus?: string;
  disabled?: boolean;
}

export const PayBookingButton = ({ bookingId, amount, paymentStatus, disabled }: PayBookingButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (paymentStatus === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
        <CreditCard className="w-3 h-3" />
        Paid
      </span>
    );
  }

  const handlePay = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-booking-payment', {
        body: { bookingId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({
        title: 'Payment Error',
        description: err.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="default"
      onClick={handlePay}
      disabled={isLoading || disabled}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      ) : (
        <CreditCard className="w-4 h-4 mr-1" />
      )}
      Pay £{amount.toLocaleString()}
    </Button>
  );
};

export default PayBookingButton;
