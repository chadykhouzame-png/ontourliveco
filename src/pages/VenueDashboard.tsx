import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Search, Calendar, MessageSquare, Settings, LogOut, Star, CheckCircle, Music, Plus, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { BookingRequest, Venue, EntertainmentRequest, BOOKING_STATUS_LABELS, BookingStatus, ENTERTAINMENT_REQUEST_STATUS_LABELS } from '@/types/database';
import { RatingDisplay } from '@/components/StarRating';
import ReviewFormDialog from '@/components/ReviewFormDialog';
import EntertainmentRequestDialog from '@/components/EntertainmentRequestDialog';
import NotificationBell from '@/components/NotificationBell';
import VisitingArtists from '@/components/VisitingArtists';
import { NotificationSettings } from '@/components/NotificationSettings';
import { NegotiationHistory, addNegotiationEvent } from '@/components/NegotiationHistory';
import { useNegotiationLimit, MAX_NEGOTIATION_ROUNDS } from '@/hooks/useNegotiationLimit';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AlertTriangle } from 'lucide-react';
const VenueDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { showErrorWithTitle } = useErrorHandler();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [entertainmentRequests, setEntertainmentRequests] = useState<EntertainmentRequest[]>([]);
  const [existingReviews, setExistingReviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  
  // Entertainment request dialog state
  const [entertainmentDialogOpen, setEntertainmentDialogOpen] = useState(false);
  
  // Update offer dialog state
  const [updateOfferDialogOpen, setUpdateOfferDialogOpen] = useState(false);
  const [newOfferAmount, setNewOfferAmount] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  
  // Negotiation limit check
  const { hasReachedLimit, remainingRounds, roundCount } = useNegotiationLimit(selectedBooking?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/join/venue');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Get venue profile
      const { data: venueData } = await supabase
        .from('venues')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!venueData) {
        navigate('/venue/setup');
        return;
      }
      
      setVenue(venueData as Venue);
      
      // Get booking requests with artist info
      const { data: requests } = await supabase
        .from('booking_requests')
        .select('*, artist:artists(*)')
        .eq('venue_id', venueData.id)
        .order('created_at', { ascending: false });
      
      setBookingRequests((requests || []) as BookingRequest[]);
      
      // Get entertainment requests
      const { data: entRequests } = await supabase
        .from('entertainment_requests')
        .select('*')
        .eq('venue_id', venueData.id)
        .order('created_at', { ascending: false });
      
      setEntertainmentRequests((entRequests || []) as EntertainmentRequest[]);
      
      // Get existing reviews by this venue
      const { data: reviews } = await supabase
        .from('reviews')
        .select('booking_request_id')
        .eq('reviewer_type', 'venue')
        .eq('reviewer_venue_id', venueData.id);
      
      setExistingReviews((reviews || []).map(r => r.booking_request_id));
      setIsLoading(false);
    };
    
    fetchData();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleMarkCompleted = async (requestId: string) => {
    const { error } = await supabase
      .from('booking_requests')
      .update({ status: 'completed' as BookingStatus })
      .eq('id', requestId);
    
    if (!error) {
      setBookingRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'completed' as BookingStatus } : req
      ));
      toast({
        title: "Booking marked as completed",
        description: "You can now leave a review for the artist.",
      });
    }
  };

  const handleOpenReviewDialog = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    if (selectedBooking) {
      setExistingReviews(prev => [...prev, selectedBooking.id]);
    }
  };

  const handleEntertainmentRequestCreated = async () => {
    if (!venue) return;
    // Refresh entertainment requests
    const { data: entRequests } = await supabase
      .from('entertainment_requests')
      .select('*')
      .eq('venue_id', venue.id)
      .order('created_at', { ascending: false });
    
    setEntertainmentRequests((entRequests || []) as EntertainmentRequest[]);
  };

  const handleOpenUpdateOffer = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setNewOfferAmount(booking.counter_offer?.toString() || '');
    setUpdateOfferDialogOpen(true);
  };

  const handleAcceptCounterOffer = async (booking: BookingRequest) => {
    if (!venue) return;
    
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ 
          status: 'accepted' as BookingStatus,
          offer_amount: booking.counter_offer 
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      // Send notification to artist
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'accepted',
            booking_request_id: booking.id,
            sender_name: venue.venue_name,
            recipient_user_id: booking.artist?.user_id,
            requested_date: booking.requested_date,
            offer_amount: booking.counter_offer,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }

      // Log negotiation event
      await addNegotiationEvent(
        booking.id,
        'venue',
        'accept',
        booking.counter_offer || undefined
      );
      
      setBookingRequests(prev => prev.map(req => 
        req.id === booking.id 
          ? { ...req, status: 'accepted' as BookingStatus, offer_amount: booking.counter_offer } 
          : req
      ));
      
      toast({
        title: "Counter-offer accepted!",
        description: `You've agreed to $${booking.counter_offer?.toLocaleString()}. The artist has been notified.`,
      });
    } catch (error: unknown) {
      showErrorWithTitle(error, "Error accepting counter-offer", 'accept-counter');
    }
  };

  const handleSubmitUpdatedOffer = async () => {
    if (!selectedBooking || !newOfferAmount || !venue) return;
    
    setIsSubmittingOffer(true);
    
    try {
      // Update the offer and clear the artist's counter-offer so they can respond again
      const { error } = await supabase
        .from('booking_requests')
        .update({ 
          offer_amount: parseInt(newOfferAmount),
          counter_offer: null  // Clear previous counter so artist can respond to new offer
        })
        .eq('id', selectedBooking.id);
      
      if (error) throw error;
      
      // Send notification to artist - use counter_offer type if responding to a counter
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: selectedBooking.counter_offer ? 'counter_offer' : 'new_offer',
            booking_request_id: selectedBooking.id,
            sender_name: venue.venue_name,
            recipient_user_id: selectedBooking.artist?.user_id,
            requested_date: selectedBooking.requested_date,
            offer_amount: selectedBooking.offer_amount,
            counter_offer: parseInt(newOfferAmount),
            message: selectedBooking.counter_offer 
              ? `Counter-offer in response to your $${selectedBooking.counter_offer?.toLocaleString()} request`
              : undefined,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }

      // Log negotiation event
      await addNegotiationEvent(
        selectedBooking.id,
        'venue',
        selectedBooking.counter_offer ? 'update_offer' : 'initial_offer',
        parseInt(newOfferAmount)
      );
      
      setBookingRequests(prev => prev.map(req => 
        req.id === selectedBooking.id 
          ? { ...req, offer_amount: parseInt(newOfferAmount), counter_offer: undefined } 
          : req
      ));
      
      toast({
        title: "Offer updated!",
        description: `Your new offer of $${parseInt(newOfferAmount).toLocaleString()} has been sent to the artist.`,
      });
      
      setUpdateOfferDialogOpen(false);
      setNewOfferAmount('');
      setSelectedBooking(null);
    } catch (error: unknown) {
      showErrorWithTitle(error, "Error updating offer", 'update-offer');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingRequests = bookingRequests.filter(r => r.status === 'pending');
  const acceptedRequests = bookingRequests.filter(r => r.status === 'accepted');
  const completedRequests = bookingRequests.filter(r => r.status === 'completed');
  const upcomingBookings = acceptedRequests.filter(r => new Date(r.requested_date) >= new Date());
  const pastAcceptedBookings = acceptedRequests.filter(r => new Date(r.requested_date) < new Date());

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Frosted Glass */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tighter">
            <span className="text-primary">ON</span>
            <span className="text-foreground">TOUR</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {venue?.venue_name}
            </span>
            <NotificationBell />
            <Button variant="ghost" size="icon" className="haptic" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {venue?.venue_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/venue/setup')} className="haptic glass-subtle">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              onClick={() => setEntertainmentDialogOpen(true)} 
              className="bg-venue hover:bg-venue/90 haptic shadow-lg shadow-venue/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Fill a Slot
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Bookings */}
          <Card className="glass border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-secondary/20">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-venue" />
                Upcoming Events
              </CardTitle>
              <CardDescription>
                {upcomingBookings.length === 0 
                  ? "No upcoming bookings"
                  : `${upcomingBookings.length} confirmed ${upcomingBookings.length === 1 ? 'booking' : 'bookings'}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Button onClick={() => navigate('/search')} variant="outline">
                    Find Artists
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 5).map((booking) => (
                    <div 
                      key={booking.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30 haptic"
                    >
                      <div>
                        <p className="font-medium">{booking.artist?.artist_name || 'Unknown Artist'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.requested_date), 'EEEE, MMMM d')}
                          {booking.requested_time && ` at ${booking.requested_time}`}
                        </p>
                      </div>
                      <Badge className="bg-venue text-venue-foreground">Confirmed</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sent Requests */}
          <Card className="glass border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-secondary/20">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-artist" />
                Sent Requests
              </CardTitle>
              <CardDescription>
                {pendingRequests.length === 0 
                  ? "No pending requests"
                  : `${pendingRequests.length} awaiting response`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No requests sent yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search for artists and send booking requests
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookingRequests.slice(0, 5).map((request) => (
                    <div 
                      key={request.id}
                      className="p-4 rounded-xl border border-border/50 bg-secondary/20 backdrop-blur-sm haptic"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{request.artist?.artist_name || 'Unknown Artist'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.requested_date), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.status === 'pending' && request.counter_offer && (
                            <Badge variant="outline" className="border-artist/50 text-artist">
                              Negotiating
                            </Badge>
                          )}
                          <Badge variant={
                            request.status === 'pending' ? 'outline' :
                            request.status === 'accepted' ? 'default' :
                            'secondary'
                          }>
                            {BOOKING_STATUS_LABELS[request.status]}
                          </Badge>
                        </div>
                      </div>
                      {/* Offer and Counter-offer display */}
                      <div className="flex flex-wrap gap-3 mb-3">
                        {request.offer_amount && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-venue/10 border border-venue/20">
                            <DollarSign className="w-4 h-4 text-venue" />
                            <span className="text-sm font-medium text-venue">
                              Your offer: ${request.offer_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {request.counter_offer && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-artist/10 border border-artist/20">
                            <DollarSign className="w-4 h-4 text-artist" />
                            <span className="text-sm font-medium text-artist">
                              Counter: ${request.counter_offer.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Counter-offer response buttons */}
                      {request.status === 'pending' && request.counter_offer && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Button 
                            size="sm"
                            className="bg-venue hover:bg-venue/90"
                            onClick={() => handleAcceptCounterOffer(request)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept ${request.counter_offer.toLocaleString()}
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenUpdateOffer(request)}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Update Offer
                          </Button>
                        </div>
                      )}
                      {request.status === 'accepted' && new Date(request.requested_date) < new Date() && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkCompleted(request.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark as Completed
                        </Button>
                      )}
                      {request.status === 'completed' && (
                        <div className="flex gap-2">
                          {existingReviews.includes(request.id) ? (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="w-3 h-3" />
                              Review submitted
                            </Badge>
                          ) : (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReviewDialog(request)}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Leave Review
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visiting Artists Section */}
        {venue?.city && (
          <div className="mt-6">
            <VisitingArtists venueCity={venue.city} />
          </div>
        )}

        {/* Quick Search */}
        <Card className="glass border-border/50 rounded-2xl overflow-hidden mt-6">
          <CardContent className="py-10">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-venue/20 flex items-center justify-center">
                <Search className="w-8 h-8 text-venue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Your Next Artist</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Search by city, date, and genre to find artists who are in town and available
              </p>
              <Button 
                onClick={() => navigate('/search')} 
                size="lg"
                className="bg-venue hover:bg-venue/90 haptic shadow-lg shadow-venue/20"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Artists
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings */}
      <div className="mt-6">
        <NotificationSettings />
      </div>

      {/* Review Dialog */}
      {selectedBooking && venue && (
        <ReviewFormDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          bookingRequestId={selectedBooking.id}
          reviewerType="venue"
          reviewerId={venue.id}
          revieweeType="artist"
          revieweeId={selectedBooking.artist_id}
          revieweeName={selectedBooking.artist?.artist_name || 'the artist'}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Entertainment Request Dialog */}
      {venue && (
        <EntertainmentRequestDialog
          open={entertainmentDialogOpen}
          onOpenChange={setEntertainmentDialogOpen}
          venueId={venue.id}
          venueName={venue.venue_name}
          venueGenres={venue.music_preferences}
          onRequestCreated={handleEntertainmentRequestCreated}
        />
      )}

      {/* Update Offer Dialog */}
      <Dialog open={updateOfferDialogOpen} onOpenChange={setUpdateOfferDialogOpen}>
        <DialogContent className="glass border-border/50 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-venue/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-venue" />
              </div>
              Update Your Offer
            </DialogTitle>
            <DialogDescription>
              Respond to {selectedBooking?.artist?.artist_name || 'the artist'}'s counter-offer
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && venue && (
            <div className="space-y-4 pt-2">
              {/* Negotiation History */}
              <div className="border border-border/50 rounded-xl p-3">
                <p className="text-sm font-medium mb-2">Negotiation History</p>
                <NegotiationHistory
                  bookingRequestId={selectedBooking.id}
                  venueName={venue.venue_name}
                  artistName={selectedBooking.artist?.artist_name || 'Artist'}
                  currentUserType="venue"
                />
              </div>
              
              {/* Show current offer summary */}
              <div className="flex gap-2">
                {selectedBooking.offer_amount && (
                  <div className="flex-1 p-3 rounded-xl bg-venue/10 border border-venue/20">
                    <p className="text-xs text-muted-foreground">Your offer</p>
                    <p className="text-lg font-semibold text-venue">
                      ${selectedBooking.offer_amount.toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedBooking.counter_offer && (
                  <div className="flex-1 p-3 rounded-xl bg-artist/10 border border-artist/20">
                    <p className="text-xs text-muted-foreground">Their counter</p>
                    <p className="text-lg font-semibold text-artist">
                      ${selectedBooking.counter_offer.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Negotiation limit warning */}
              {hasReachedLimit ? (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Negotiation Limit Reached</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You've reached the maximum of {MAX_NEGOTIATION_ROUNDS} negotiation rounds. 
                    Please accept the artist's counter-offer or cancel this booking to proceed.
                  </p>
                </div>
              ) : (
                <>
                  {roundCount > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {remainingRounds} negotiation round{remainingRounds !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="newOffer">Your new offer ($)</Label>
                    <Input
                      id="newOffer"
                      type="number"
                      placeholder="Enter your updated offer"
                      value={newOfferAmount}
                      onChange={(e) => setNewOfferAmount(e.target.value)}
                      min="0"
                      className="text-lg"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setUpdateOfferDialogOpen(false)}
                      className="flex-1 haptic glass-subtle"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitUpdatedOffer}
                      disabled={!newOfferAmount || isSubmittingOffer}
                      className="flex-1 bg-venue hover:bg-venue/90 haptic shadow-lg shadow-venue/20"
                    >
                      {isSubmittingOffer ? 'Sending...' : 'Send Updated Offer'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenueDashboard;
