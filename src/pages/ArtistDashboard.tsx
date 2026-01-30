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
import { Music, Calendar, MapPin, MessageSquare, Settings, Plus, LogOut, Star, CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { TravelDate, BookingRequest, Artist, BOOKING_STATUS_LABELS, BookingStatus } from '@/types/database';
import { RatingDisplay } from '@/components/StarRating';
import ReviewFormDialog from '@/components/ReviewFormDialog';
import NotificationBell from '@/components/NotificationBell';
import ArtistCalendar from '@/components/ArtistCalendar';
import { NotificationSettings } from '@/components/NotificationSettings';
import { NegotiationHistory, addNegotiationEvent } from '@/components/NegotiationHistory';
import { useNegotiationLimit, MAX_NEGOTIATION_ROUNDS } from '@/hooks/useNegotiationLimit';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AlertTriangle } from 'lucide-react';

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { showErrorWithTitle } = useErrorHandler();
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [travelDates, setTravelDates] = useState<TravelDate[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [existingReviews, setExistingReviews] = useState<string[]>([]); // booking IDs that have been reviewed
  const [isLoading, setIsLoading] = useState(true);
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  
  // Counter-offer dialog state
  const [counterOfferDialogOpen, setCounterOfferDialogOpen] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);
  
  // Negotiation limit check
  const { hasReachedLimit, remainingRounds, roundCount } = useNegotiationLimit(selectedBooking?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/join/artist');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Get artist profile
      const { data: artistData } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!artistData) {
        navigate('/artist/setup');
        return;
      }
      
      setArtist(artistData as Artist);
      
      // Get travel dates
      const { data: dates } = await supabase
        .from('travel_dates')
        .select('*')
        .eq('artist_id', artistData.id)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true });
      
      setTravelDates(dates || []);
      
      // Get booking requests with venue info
      const { data: requests } = await supabase
        .from('booking_requests')
        .select('*, venue:venues(*)')
        .eq('artist_id', artistData.id)
        .order('created_at', { ascending: false });
      
      setBookingRequests((requests || []) as BookingRequest[]);
      
      // Get existing reviews by this artist
      const { data: reviews } = await supabase
        .from('reviews')
        .select('booking_request_id')
        .eq('reviewer_type', 'artist')
        .eq('reviewer_artist_id', artistData.id);
      
      setExistingReviews((reviews || []).map(r => r.booking_request_id));
      setIsLoading(false);
    };
    
    fetchData();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleUpdateRequestStatus = async (requestId: string, status: BookingStatus) => {
    const request = bookingRequests.find(r => r.id === requestId);
    if (!request) return;

    const { error } = await supabase
      .from('booking_requests')
      .update({ status })
      .eq('id', requestId);
    
    if (!error) {
      setBookingRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status } : req
      ));
      
      if (status === 'completed') {
        toast({
          title: "Booking marked as completed",
          description: "You can now leave a review for this venue.",
        });
      } else if (status === 'accepted' || status === 'declined') {
        // Send notification to venue
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              type: status,
              booking_request_id: requestId,
              sender_name: artist?.artist_name || 'An artist',
              recipient_user_id: request.venue?.user_id,
              requested_date: request.requested_date,
              offer_amount: request.offer_amount,
            },
          });
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
        }

        // Log negotiation event
        await addNegotiationEvent(
          requestId,
          'artist',
          status === 'accepted' ? 'accept' : 'decline',
          request.counter_offer || request.offer_amount || undefined
        );
        
        toast({
          title: status === 'accepted' ? "Booking accepted!" : "Booking declined",
          description: status === 'accepted' 
            ? "The venue has been notified." 
            : "The venue has been notified of your decision.",
        });
      }
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

  const handleOpenCounterOffer = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setCounterOfferAmount(artist?.fee_range_min?.toString() || '');
    setCounterOfferDialogOpen(true);
  };

  const handleSubmitCounterOffer = async () => {
    if (!selectedBooking || !counterOfferAmount) return;
    
    setIsSubmittingCounter(true);
    
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ counter_offer: parseInt(counterOfferAmount) })
        .eq('id', selectedBooking.id);
      
      if (error) throw error;
      
      // Send notification to venue
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'counter_offer',
            booking_request_id: selectedBooking.id,
            sender_name: artist?.artist_name || 'An artist',
            recipient_user_id: selectedBooking.venue?.user_id,
            requested_date: selectedBooking.requested_date,
            offer_amount: selectedBooking.offer_amount,
            counter_offer: parseInt(counterOfferAmount),
          },
        });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }

      // Log negotiation event
      await addNegotiationEvent(
        selectedBooking.id,
        'artist',
        'counter_offer',
        parseInt(counterOfferAmount)
      );
      setBookingRequests(prev => prev.map(req => 
        req.id === selectedBooking.id 
          ? { ...req, counter_offer: parseInt(counterOfferAmount) } 
          : req
      ));
      
      toast({
        title: "Counter-offer sent!",
        description: `You've proposed $${parseInt(counterOfferAmount).toLocaleString()} to the venue.`,
      });
      
      setCounterOfferDialogOpen(false);
      setCounterOfferAmount('');
      setSelectedBooking(null);
    } catch (error: unknown) {
      showErrorWithTitle(error, "Error sending counter-offer", 'counter-offer');
    } finally {
      setIsSubmittingCounter(false);
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
  const upcomingDates = travelDates.filter(td => new Date(td.start_date) >= new Date());
  
  // Check for accepted bookings that are past their date (can be marked complete)
  const pastAcceptedBookings = acceptedRequests.filter(
    r => new Date(r.requested_date) < new Date()
  );

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
              {artist?.artist_name}
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
            <p className="text-muted-foreground">Welcome back, {artist?.artist_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/artist/setup')} className="haptic glass-subtle">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button onClick={() => navigate('/artist/travel')} className="bg-artist hover:bg-artist/90 haptic shadow-lg shadow-artist/20">
              <Plus className="w-4 h-4 mr-2" />
              Add Travel
            </Button>
          </div>
        </div>

        {/* Calendar Overview */}
        <div className="mb-6">
          <ArtistCalendar travelDates={travelDates} bookingRequests={bookingRequests} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Travel */}
          <Card className="glass border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-secondary/20">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-artist" />
                Upcoming Travel
              </CardTitle>
              <CardDescription>
                {upcomingDates.length === 0 
                  ? "No upcoming travel dates"
                  : `${upcomingDates.length} upcoming ${upcomingDates.length === 1 ? 'trip' : 'trips'}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingDates.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">Add your travel dates to get discovered</p>
                  <Button onClick={() => navigate('/artist/travel')} variant="outline">
                    Add Travel Dates
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDates.slice(0, 5).map((td) => (
                    <div 
                      key={td.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30 haptic"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-artist" />
                        <div>
                          <p className="font-medium">{td.city}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(td.start_date), 'MMM d')} – {format(new Date(td.end_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={td.is_available ? "default" : "secondary"}>
                        {td.is_available ? 'Available' : 'Tentative'}
                      </Badge>
                    </div>
                  ))}
                  {upcomingDates.length > 5 && (
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => navigate('/artist/travel')}
                    >
                      View all {upcomingDates.length} dates
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Requests */}
          <Card className="glass border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-secondary/20">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-venue" />
                Booking Requests
              </CardTitle>
              <CardDescription>
                {pendingRequests.length === 0 
                  ? "No pending requests"
                  : `${pendingRequests.length} pending ${pendingRequests.length === 1 ? 'request' : 'requests'}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No booking requests yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Keep adding travel dates to get discovered
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
                          <Link 
                            to={`/venue/${request.venue_id}`}
                            className="font-medium hover:text-venue hover:underline transition-colors"
                          >
                            {request.venue?.venue_name || 'Unknown Venue'}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.requested_date), 'EEEE, MMMM d, yyyy')}
                            {request.requested_time && ` at ${request.requested_time}`}
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
                      {request.message && (
                        <p className="text-sm text-muted-foreground mb-3">
                          "{request.message}"
                        </p>
                      )}
                      {/* Offer and Counter-offer display */}
                      <div className="flex flex-wrap gap-3 mb-3">
                        {request.offer_amount && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-venue/10 border border-venue/20">
                            <DollarSign className="w-4 h-4 text-venue" />
                            <span className="text-sm font-medium text-venue">
                              Venue offer: ${request.offer_amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {request.counter_offer && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-artist/10 border border-artist/20">
                            <DollarSign className="w-4 h-4 text-artist" />
                            <span className="text-sm font-medium text-artist">
                              Your counter: ${request.counter_offer.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm"
                            className="bg-artist hover:bg-artist/90"
                            onClick={() => handleUpdateRequestStatus(request.id, 'accepted')}
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCounterOffer(request)}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Counter Offer
                          </Button>
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={() => handleUpdateRequestStatus(request.id, 'declined')}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                      {request.status === 'accepted' && new Date(request.requested_date) < new Date() && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
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

        {/* Notification Settings */}
        <div className="mt-6">
          <NotificationSettings />
        </div>
      </div>

      {/* Review Dialog */}
      {selectedBooking && artist && (
        <ReviewFormDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          bookingRequestId={selectedBooking.id}
          reviewerType="artist"
          reviewerId={artist.id}
          revieweeType="venue"
          revieweeId={selectedBooking.venue_id}
          revieweeName={selectedBooking.venue?.venue_name || 'the venue'}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Counter-Offer Dialog */}
      <Dialog open={counterOfferDialogOpen} onOpenChange={setCounterOfferDialogOpen}>
        <DialogContent className="glass border-border/50 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-artist/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-artist" />
              </div>
              Make a Counter-Offer
            </DialogTitle>
            <DialogDescription>
              Propose your fee to {selectedBooking?.venue?.venue_name || 'the venue'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4 pt-2">
              {/* Negotiation History */}
              <div className="border border-border/50 rounded-xl p-3">
                <p className="text-sm font-medium mb-2">Negotiation History</p>
                <NegotiationHistory
                  bookingRequestId={selectedBooking.id}
                  venueName={selectedBooking.venue?.venue_name || 'Venue'}
                  artistName={artist?.artist_name || 'You'}
                  currentUserType="artist"
                />
              </div>
              
              {/* Show venue's offer if they made one */}
              {selectedBooking.offer_amount && (
                <div className="p-4 rounded-xl bg-venue/10 border border-venue/20">
                  <p className="text-sm text-muted-foreground">Current venue offer</p>
                  <p className="text-xl font-bold text-venue">
                    ${selectedBooking.offer_amount.toLocaleString()}
                  </p>
                </div>
              )}
              
              {/* Show artist's rate range if set */}
              {artist?.show_fee_range && (artist?.fee_range_min || artist?.fee_range_max) && (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                  <p className="text-sm text-muted-foreground">Your listed rate</p>
                  <p className="text-lg font-semibold">
                    {artist.fee_range_min && artist.fee_range_max 
                      ? `$${artist.fee_range_min.toLocaleString()} - $${artist.fee_range_max.toLocaleString()}`
                      : artist.fee_range_min 
                        ? `From $${artist.fee_range_min.toLocaleString()}`
                        : `Up to $${artist.fee_range_max?.toLocaleString()}`
                    }
                  </p>
                </div>
              )}
              
              {/* Negotiation limit warning */}
              {hasReachedLimit ? (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Negotiation Limit Reached</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You've reached the maximum of {MAX_NEGOTIATION_ROUNDS} negotiation rounds. 
                    Please accept or decline this booking to proceed.
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
                    <Label htmlFor="counterOffer">Your counter-offer ($)</Label>
                    <Input
                      id="counterOffer"
                      type="number"
                      placeholder="Enter your fee"
                      value={counterOfferAmount}
                      onChange={(e) => setCounterOfferAmount(e.target.value)}
                      min="0"
                      className="text-lg"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setCounterOfferDialogOpen(false)}
                      className="flex-1 haptic glass-subtle"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitCounterOffer}
                      disabled={!counterOfferAmount || isSubmittingCounter}
                      className="flex-1 bg-artist hover:bg-artist/90 haptic shadow-lg shadow-artist/20"
                    >
                      {isSubmittingCounter ? 'Sending...' : 'Send Counter-Offer'}
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

export default ArtistDashboard;
