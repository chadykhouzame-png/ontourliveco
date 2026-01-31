import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DisputeSubmitDialogProps {
  targetType: 'artist' | 'venue';
  targetId: string;
  targetName: string;
  userId: string;
}

interface BookingRequest {
  id: string;
  requested_date: string;
  status: string;
  offer_amount: number | null;
  artist_name?: string;
  venue_name?: string;
}

const DISPUTE_TYPES = [
  { value: 'misconduct', label: 'Misconduct or Inappropriate Behavior' },
  { value: 'no_show', label: 'No Show' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'quality', label: 'Quality of Service' },
  { value: 'misrepresentation', label: 'Profile Misrepresentation' },
  { value: 'other', label: 'Other' },
];

const DisputeSubmitDialog = ({ targetType, targetId, targetName, userId }: DisputeSubmitDialogProps) => {
  const [open, setOpen] = useState(false);
  const [disputeType, setDisputeType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRelevantBookings();
    }
  }, [open, targetType, targetId, userId]);

  const fetchRelevantBookings = async () => {
    setIsLoadingBookings(true);
    try {
      if (targetType === 'artist') {
        // User is reporting an artist - find bookings where user's venue booked this artist
        const { data: userVenues } = await supabase
          .from('venues')
          .select('id')
          .eq('user_id', userId);

        if (userVenues && userVenues.length > 0) {
          const venueIds = userVenues.map(v => v.id);
          const { data: bookings } = await supabase
            .from('booking_requests')
            .select(`
              id,
              requested_date,
              status,
              offer_amount,
              artists!inner(artist_name)
            `)
            .eq('artist_id', targetId)
            .in('venue_id', venueIds)
            .order('requested_date', { ascending: false })
            .limit(20);

          if (bookings) {
            setBookingRequests(bookings.map(b => ({
              id: b.id,
              requested_date: b.requested_date,
              status: b.status || 'pending',
              offer_amount: b.offer_amount,
              artist_name: (b.artists as any)?.artist_name,
            })));
          }
        }
      } else {
        // User is reporting a venue - find bookings where user's artist was booked by this venue
        const { data: userArtists } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', userId);

        if (userArtists && userArtists.length > 0) {
          const artistIds = userArtists.map(a => a.id);
          const { data: bookings } = await supabase
            .from('booking_requests')
            .select(`
              id,
              requested_date,
              status,
              offer_amount,
              venues!inner(venue_name)
            `)
            .eq('venue_id', targetId)
            .in('artist_id', artistIds)
            .order('requested_date', { ascending: false })
            .limit(20);

          if (bookings) {
            setBookingRequests(bookings.map(b => ({
              id: b.id,
              requested_date: b.requested_date,
              status: b.status || 'pending',
              offer_amount: b.offer_amount,
              venue_name: (b.venues as any)?.venue_name,
            })));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const formatBookingLabel = (booking: BookingRequest) => {
    const date = format(new Date(booking.requested_date), 'MMM d, yyyy');
    const amount = booking.offer_amount ? ` - $${booking.offer_amount}` : '';
    const status = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
    return `${date}${amount} (${status})`;
  };

  const handleSubmit = async () => {
    if (!disputeType || !title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (title.trim().length < 5) {
      toast.error('Title must be at least 5 characters');
      return;
    }

    if (description.trim().length < 20) {
      toast.error('Please provide more detail in the description (at least 20 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      const disputeData: Record<string, unknown> = {
        reporter_user_id: userId,
        dispute_type: disputeType,
        title: title.trim(),
        description: description.trim(),
        status: 'open',
      };

      if (targetType === 'artist') {
        disputeData.reported_artist_id = targetId;
      } else {
        disputeData.reported_venue_id = targetId;
      }

      if (selectedBookingId && selectedBookingId !== 'none') {
        disputeData.booking_request_id = selectedBookingId;
      }

      const { error } = await supabase.from('disputes').insert(disputeData as any);

      if (error) throw error;

      toast.success('Dispute submitted successfully. Our team will review it shortly.');
      setOpen(false);
      resetForm();
    } catch (error: unknown) {
      console.error('Failed to submit dispute:', error);
      toast.error('Failed to submit dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDisputeType('');
    setTitle('');
    setDescription('');
    setSelectedBookingId('');
    setBookingRequests([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Report {targetType === 'artist' ? 'Artist' : 'Venue'}
          </DialogTitle>
          <DialogDescription>
            Submit a dispute about <strong>{targetName}</strong>. Our team will review and respond within 48 hours.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="dispute-type">Issue Type *</Label>
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger id="dispute-type">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {bookingRequests.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="booking-request" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Related Booking (Optional)
              </Label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger id="booking-request">
                  <SelectValue placeholder={isLoadingBookings ? "Loading bookings..." : "Select a booking for context"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No booking attached</SelectItem>
                  {bookingRequests.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {formatBookingLabel(booking)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Attaching a booking helps our team investigate faster
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dispute-title">Title *</Label>
            <Input
              id="dispute-title"
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispute-description">Description *</Label>
            <Textarea
              id="dispute-description"
              placeholder="Please provide details about what happened, including dates and any relevant information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/2000
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || !disputeType || !title.trim() || !description.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeSubmitDialog;
