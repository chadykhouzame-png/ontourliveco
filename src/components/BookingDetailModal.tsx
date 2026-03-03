import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NegotiationHistory } from '@/components/NegotiationHistory';
import { BOOKING_STATUS_LABELS, type BookingRequest, type BookingStatus } from '@/types/database';
import { format } from 'date-fns';
import { Calendar, DollarSign, MapPin, Users, Clock, FileText, MessageSquare, CheckCircle } from 'lucide-react';

interface BookingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRequest | null;
  currentUserType: 'artist' | 'venue';
}

function statusVariant(status: BookingStatus) {
  switch (status) {
    case 'pending': return 'outline';
    case 'accepted': return 'default';
    case 'completed': return 'secondary';
    case 'declined': return 'destructive';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
}

export default function BookingDetailModal({
  open,
  onOpenChange,
  booking,
  currentUserType,
}: BookingDetailModalProps) {
  if (!booking) return null;

  const isArtist = currentUserType === 'artist';
  const otherPartyName = isArtist
    ? booking.venue?.venue_name || 'Unknown Venue'
    : booking.artist?.artist_name || 'Unknown Artist';
  const artistName = booking.artist?.artist_name || 'Unknown Artist';
  const venueName = booking.venue?.venue_name || 'Unknown Venue';
  const completionNotes = booking.completion_notes;

  const agreedAmount = booking.counter_offer || booking.offer_amount;
  const isNegotiating = booking.status === 'pending' && !!booking.counter_offer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {/* Status & Other Party */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {isArtist ? 'Venue' : 'Artist'}
                </p>
                <p className="text-lg font-semibold">{otherPartyName}</p>
              </div>
              <div className="flex items-center gap-2">
                {isNegotiating && (
                  <Badge variant="outline" className={currentUserType === 'artist' ? 'border-artist/50 text-artist' : 'border-venue/50 text-venue'}>
                    Negotiating
                  </Badge>
                )}
                <Badge variant={statusVariant(booking.status)}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date">
                {format(new Date(booking.requested_date), 'EEEE, MMMM d, yyyy')}
              </DetailRow>
              {booking.requested_time && (
                <DetailRow icon={<Clock className="w-4 h-4" />} label="Time">
                  {booking.requested_time}
                </DetailRow>
              )}
            </div>

            {/* Venue details (for artist view) */}
            {isArtist && booking.venue && (
              <div className="grid grid-cols-2 gap-4">
                {booking.venue.city && (
                  <DetailRow icon={<MapPin className="w-4 h-4" />} label="City">
                    {booking.venue.city}
                  </DetailRow>
                )}
                {booking.venue.capacity_min != null && booking.venue.capacity_max != null && (
                  <DetailRow icon={<Users className="w-4 h-4" />} label="Capacity">
                    {booking.venue.capacity_min}–{booking.venue.capacity_max}
                  </DetailRow>
                )}
              </div>
            )}

            {/* Artist city (for venue view) */}
            {!isArtist && booking.artist && (
              <div className="grid grid-cols-2 gap-4">
                {booking.artist.primary_city && (
                  <DetailRow icon={<MapPin className="w-4 h-4" />} label="Based in">
                    {booking.artist.primary_city}
                  </DetailRow>
                )}
              </div>
            )}

            {/* Booking message */}
            {booking.message && (
              <div className="px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Message
                </p>
                <p className="text-sm text-foreground">"{booking.message}"</p>
              </div>
            )}

            <Separator />

            {/* Financial summary */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Financial</p>
              <div className="grid grid-cols-2 gap-3">
                {booking.offer_amount != null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-venue/10 border border-venue/20">
                    <DollarSign className="w-4 h-4 text-venue" />
                    <div>
                      <p className="text-xs text-muted-foreground">Venue Offer</p>
                      <p className="text-sm font-semibold text-venue">${booking.offer_amount.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {booking.counter_offer != null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-artist/10 border border-artist/20">
                    <DollarSign className="w-4 h-4 text-artist" />
                    <div>
                      <p className="text-xs text-muted-foreground">Artist Counter</p>
                      <p className="text-sm font-semibold text-artist">${booking.counter_offer.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
              {(booking.status === 'accepted' || booking.status === 'completed') && agreedAmount != null && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Agreed Fee</p>
                    <p className="text-sm font-bold text-primary">${agreedAmount.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {booking.payment_status && booking.payment_status !== 'unpaid' && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Payment: {booking.payment_status}
                  </Badge>
                </div>
              )}
            </div>

            {/* Completion Notes */}
            {booking.status === 'completed' && completionNotes && (
              <>
                <Separator />
                <div className="px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Completion Notes
                  </p>
                  <p className="text-sm text-foreground">"{completionNotes}"</p>
                </div>
              </>
            )}

            {/* Negotiation History */}
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Negotiation History</p>
              <NegotiationHistory
                bookingRequestId={booking.id}
                venueName={venueName}
                artistName={artistName}
                currentUserType={currentUserType}
              />
            </div>

            {/* Metadata */}
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="block">Created</span>
                <span className="text-foreground">{format(new Date(booking.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div>
                <span className="block">Last Updated</span>
                <span className="text-foreground">{format(new Date(booking.updated_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{children}</p>
      </div>
    </div>
  );
}
