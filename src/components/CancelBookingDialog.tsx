import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  bookingDate?: string;
  otherPartyName?: string;
  isSubmitting?: boolean;
}

export default function CancelBookingDialog({
  open,
  onOpenChange,
  onConfirm,
  bookingDate,
  otherPartyName,
  isSubmitting = false,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setReason('');
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            {otherPartyName
              ? `Are you sure you want to cancel your booking with ${otherPartyName}${bookingDate ? ` on ${bookingDate}` : ''}?`
              : 'Are you sure you want to cancel this booking?'}
            {' '}This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
          <Textarea
            id="cancel-reason"
            placeholder="Let the other party know why you're cancelling…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
