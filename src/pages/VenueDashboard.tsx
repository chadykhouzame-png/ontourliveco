import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Search, Calendar, MessageSquare, Settings, LogOut, Star, CheckCircle, Music, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { BookingRequest, Venue, EntertainmentRequest, BOOKING_STATUS_LABELS, BookingStatus, ENTERTAINMENT_REQUEST_STATUS_LABELS } from '@/types/database';
import { RatingDisplay } from '@/components/StarRating';
import ReviewFormDialog from '@/components/ReviewFormDialog';
import EntertainmentRequestDialog from '@/components/EntertainmentRequestDialog';
import NotificationBell from '@/components/NotificationBell';
import { useToast } from '@/hooks/use-toast';
const VenueDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
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
      {/* Header */}
      <header className="border-b border-border bg-card">
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
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
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
            <Button variant="outline" onClick={() => navigate('/venue/setup')}>
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              onClick={() => setEntertainmentDialogOpen(true)} 
              className="bg-venue hover:bg-venue/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Fill a Slot
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Bookings */}
          <Card className="bg-card border-border">
            <CardHeader>
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
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
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
          <Card className="bg-card border-border">
            <CardHeader>
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
                      className="p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{request.artist?.artist_name || 'Unknown Artist'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.requested_date), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={
                          request.status === 'pending' ? 'outline' :
                          request.status === 'accepted' ? 'default' :
                          'secondary'
                        }>
                          {BOOKING_STATUS_LABELS[request.status]}
                        </Badge>
                      </div>
                      {request.offer_amount && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Offered: ${request.offer_amount}
                        </p>
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

        {/* Quick Search */}
        <Card className="bg-card border-border mt-6">
          <CardContent className="py-8">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Find Your Next Artist</h3>
              <p className="text-muted-foreground mb-6">
                Search by city, date, and genre to find artists who are in town and available
              </p>
              <Button 
                onClick={() => navigate('/search')} 
                size="lg"
                className="bg-venue hover:bg-venue/90"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Artists
              </Button>
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
};

export default VenueDashboard;
