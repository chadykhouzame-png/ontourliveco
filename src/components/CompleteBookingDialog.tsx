import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

interface CompleteBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
  bookingDate?: string;
  otherPartyName?: string;
  isSubmitting?: boolean;
}

export default function CompleteBookingDialog({
  open,
  onOpenChange,
  onConfirm,
  bookingDate,
  otherPartyName,
  isSubmitting = false,
}: CompleteBookingDialogProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes.trim());
    setNotes('');
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setNotes('');
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            Mark Booking as Completed
          </DialogTitle>
          <DialogDescription>
            {otherPartyName
              ? `Confirm that your booking with ${otherPartyName}${bookingDate ? ` on ${bookingDate}` : ''} has been completed.`
              : 'Confirm that this booking has been completed.'}
            {' '}You'll be able to leave a review afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="complete-notes">Notes (optional)</Label>
          <Textarea
            id="complete-notes"
            placeholder="Add any notes about the booking…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Go Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Completing…' : 'Confirm Completed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
