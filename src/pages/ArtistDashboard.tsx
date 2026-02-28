import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Music, Calendar, MapPin, MessageSquare, Settings, Plus, LogOut, Star, CheckCircle, XCircle, DollarSign, Building2, Users, BarChart3, Shield } from 'lucide-react';
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
import UserDisputes from '@/components/UserDisputes';
import StripeConnectSetup from '@/components/StripeConnectSetup';
import ArtistEPKUpload from '@/components/ArtistEPKUpload';
import { BookingStatusFilter, StatusFilter } from '@/components/BookingStatusFilter';
import CancelBookingDialog from '@/components/CancelBookingDialog';
import CompleteBookingDialog from '@/components/CompleteBookingDialog';
import { useBookingNotifications } from '@/hooks/useBookingNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import logo from '@/assets/logo.png';

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { showErrorWithTitle, executeWithRetry } = useErrorHandler();
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [travelDates, setTravelDates] = useState<TravelDate[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [existingReviews, setExistingReviews] = useState<string[]>([]); // booking IDs that have been reviewed
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  
  // Counter-offer dialog state
  const [counterOfferDialogOpen, setCounterOfferDialogOpen] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);
  
  // Cancel booking dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Complete booking dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Status filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  // Negotiation limit check
  const { hasReachedLimit, remainingRounds, roundCount } = useNegotiationLimit(selectedBooking?.id);
  
  // Sound and browser notifications for new bookings
  useBookingNotifications({ 
    entityId: artist?.id, 
    entityType: 'artist',
    enabled: !!artist?.id 
  });

  // Unread message count for Messages button
  const { unreadCount } = useUnreadMessages({
    entityId: artist?.id,
    entityType: 'artist',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/join/artist');
    }
  }, [user, authLoading, navigate]);

  // Check if user has admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    let artistId: string | null = null;
    
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Get artist profile with retry
        const artistData = await executeWithRetry(async () => {
          const { data, error } = await supabase
            .from('artists')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) throw error;
          return data;
        }, 'fetching artist profile');
        
        if (!artistData) {
          navigate('/artist/setup');
          return;
        }
        
        artistId = artistData.id;
        setArtist(artistData as Artist);
        
        // Fetch remaining data in parallel with retry
        const [dates, requests, reviews] = await Promise.all([
          // Get travel dates
          executeWithRetry(async () => {
            const { data, error } = await supabase
              .from('travel_dates')
              .select('*')
              .eq('artist_id', artistData.id)
              .gte('end_date', new Date().toISOString().split('T')[0])
              .order('start_date', { ascending: true });
            
            if (error) throw error;
            return data || [];
          }, 'fetching travel dates'),
          
          // Get booking requests with venue info
          executeWithRetry(async () => {
            const { data, error } = await supabase
              .from('booking_requests')
              .select('*, venue:venues(*)')
              .eq('artist_id', artistData.id)
              .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
          }, 'fetching booking requests'),
          
          // Get existing reviews by this artist
          executeWithRetry(async () => {
            const { data, error } = await supabase
              .from('reviews')
              .select('booking_request_id')
              .eq('reviewer_type', 'artist')
              .eq('reviewer_artist_id', artistData.id);
            
            if (error) throw error;
            return data || [];
          }, 'fetching reviews'),
        ]);
        
        setTravelDates(dates as TravelDate[]);
        setBookingRequests(requests as BookingRequest[]);
        setExistingReviews(reviews.map(r => r.booking_request_id));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, navigate, executeWithRetry]);

  // Realtime subscription for booking requests
  useEffect(() => {
    if (!artist?.id) return;

    const channel = supabase
      .channel(`artist-bookings-${artist.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `artist_id=eq.${artist.id}`,
        },
        async (payload) => {
          console.log('Realtime booking update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the new request with venue info
            const { data } = await supabase
              .from('booking_requests')
              .select('*, venue:venues(*)')
              .eq('id', payload.new.id)
              .single();
            
            if (data) {
              setBookingRequests(prev => [data as BookingRequest, ...prev]);
              toast({
                title: "New Booking Request",
                description: "You have a new booking request!",
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Fetch the updated request with venue info
            const { data } = await supabase
              .from('booking_requests')
              .select('*, venue:venues(*)')
              .eq('id', payload.new.id)
              .single();
            
            if (data) {
              setBookingRequests(prev => 
                prev.map(req => req.id === payload.new.id ? data as BookingRequest : req)
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setBookingRequests(prev => 
              prev.filter(req => req.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [artist?.id, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleUpdateRequestStatus = async (requestId: string, status: BookingStatus) => {
    const request = bookingRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('booking_requests')
          .update({ status })
          .eq('id', requestId);
        
        if (error) throw error;
      }, 'updating booking status');
      
      // Update local state on success
      setBookingRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status } : req
      ));
      
      if (status === 'completed') {
        // Send review request notifications to both parties (fire and forget)
        try {
          await supabase.functions.invoke('send-booking-notification', {
            body: {
              type: 'completed',
              booking_request_id: requestId,
              requested_date: request.requested_date,
            },
          });
        } catch (notifError) {
          console.error('Error sending completion notification:', notifError);
        }

        toast({
          title: "Booking marked as completed",
          description: "You can now leave a review for this venue.",
        });
      } else if (status === 'accepted' || status === 'declined') {
        // Send notification to venue (fire and forget)
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
      } else if (status === 'cancelled') {
        // Handled by handleConfirmCancel with reason dialog
      }
    } catch (error) {
      showErrorWithTitle(error, "Error updating booking", 'update-booking-status');
    }
  };

  const handleOpenCancelDialog = (bookingId: string) => {
    setCancellingBookingId(bookingId);
    setCancelDialogOpen(true);
  };

  const handleOpenCompleteDialog = (bookingId: string) => {
    setCompletingBookingId(bookingId);
    setCompleteDialogOpen(true);
  };

  const handleConfirmComplete = async (notes: string) => {
    if (!completingBookingId) return;
    const request = bookingRequests.find(r => r.id === completingBookingId);
    if (!request) return;

    setIsCompleting(true);
    try {
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('booking_requests')
          .update({ status: 'completed' as BookingStatus, completion_notes: notes || null })
          .eq('id', completingBookingId);
        if (error) throw error;
      }, 'marking booking complete');

      setBookingRequests(prev => prev.map(req =>
        req.id === completingBookingId ? { ...req, status: 'completed' as BookingStatus, completion_notes: notes || null } : req
      ));

      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'completed',
            booking_request_id: completingBookingId,
            requested_date: request.requested_date,
            completion_notes: notes || undefined,
          },
        });
      } catch (notifError) {
        console.error('Error sending completion notification:', notifError);
      }

      toast({
        title: "Booking marked as completed",
        description: "You can now leave a review for this venue.",
      });
      setCompleteDialogOpen(false);
    } catch (error) {
      showErrorWithTitle(error, "Error marking booking complete", 'mark-complete');
    } finally {
      setIsCompleting(false);
    }
  };
  const handleConfirmCancel = async (reason: string) => {
    if (!cancellingBookingId || !artist) return;
    const request = bookingRequests.find(r => r.id === cancellingBookingId);
    if (!request) return;

    setIsCancelling(true);
    try {
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('booking_requests')
          .update({ status: 'cancelled' as BookingStatus })
          .eq('id', cancellingBookingId);
        if (error) throw error;
      }, 'cancelling booking');

      setBookingRequests(prev => prev.map(req =>
        req.id === cancellingBookingId ? { ...req, status: 'cancelled' as BookingStatus } : req
      ));

      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'cancelled',
            booking_request_id: cancellingBookingId,
            sender_name: artist.artist_name || 'An artist',
            recipient_user_id: request.venue?.user_id,
            requested_date: request.requested_date,
            offer_amount: request.counter_offer || request.offer_amount,
            message: reason || undefined,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send cancellation notification:', notifyError);
      }

      toast({
        title: "Booking cancelled",
        description: "The venue has been notified of the cancellation.",
        variant: "destructive",
      });
      setCancelDialogOpen(false);
    } catch (error) {
      showErrorWithTitle(error, "Error cancelling booking", 'cancel-booking');
    } finally {
      setIsCancelling(false);
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
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('booking_requests')
          .update({ counter_offer: parseInt(counterOfferAmount) })
          .eq('id', selectedBooking.id);
        
        if (error) throw error;
      }, 'submitting counter-offer');
      
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

  // Computed values - must be before any early returns for hook consistency
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending');
  const acceptedRequests = bookingRequests.filter(r => r.status === 'accepted');
  const completedRequests = bookingRequests.filter(r => r.status === 'completed');
  const declinedRequests = bookingRequests.filter(r => r.status === 'declined');
  const upcomingDates = travelDates.filter(td => new Date(td.start_date) >= new Date());
  
  // Filter counts for the filter component
  const filterCounts = useMemo(() => ({
    all: bookingRequests.length,
    pending: pendingRequests.length,
    accepted: acceptedRequests.length,
    completed: completedRequests.length,
    declined: declinedRequests.length,
    cancelled: bookingRequests.filter(r => r.status === 'cancelled').length,
  }), [bookingRequests.length, pendingRequests.length, acceptedRequests.length, completedRequests.length, declinedRequests.length, bookingRequests]);
  
  // Filtered booking requests based on status filter
  const filteredBookingRequests = useMemo(() => {
    if (statusFilter === 'all') return bookingRequests;
    return bookingRequests.filter(r => r.status === statusFilter);
  }, [bookingRequests, statusFilter]);
  
  // Check for accepted bookings that are past their date (can be marked complete)
  const pastAcceptedBookings = acceptedRequests.filter(
    r => new Date(r.requested_date) < new Date()
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Frosted Glass */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="On Tour Live" className="h-14 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {artist?.artist_name}
            </span>
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="haptic text-primary" 
                onClick={() => navigate('/admin')}
              >
                <Shield className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              {pendingRequests.length > 0 && (
                <Badge className="bg-venue text-venue-foreground animate-pulse">
                  {pendingRequests.length} pending
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Welcome back, {artist?.artist_name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => navigate('/analytics')} variant="outline" className="haptic glass-subtle">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button onClick={() => navigate('/messages')} variant="outline" className="haptic glass-subtle relative">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
            <Button onClick={() => navigate('/search/venues')} className="bg-venue hover:bg-venue/90 haptic shadow-lg shadow-venue/20">
              <Building2 className="w-4 h-4 mr-2" />
              Browse Venues
            </Button>
            <Button variant="outline" onClick={() => navigate('/artist/setup')} className="haptic glass-subtle">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button onClick={() => navigate('/artist/travel')} variant="outline" className="haptic glass-subtle">
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
            <CardHeader className="border-b border-border/30 bg-secondary/20 space-y-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-venue" />
                  Booking Requests
                  {pendingRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {pendingRequests.length === 0 
                    ? "No pending requests"
                    : `${pendingRequests.length} pending ${pendingRequests.length === 1 ? 'request' : 'requests'}`
                  }
                </CardDescription>
              </div>
              {bookingRequests.length > 0 && (
                <BookingStatusFilter
                  value={statusFilter}
                  onChange={setStatusFilter}
                  counts={filterCounts}
                />
              )}
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
              ) : filteredBookingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No {statusFilter} requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookingRequests.slice(0, 10).map((request) => (
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
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>
                              {format(new Date(request.requested_date), 'EEEE, MMMM d, yyyy')}
                              {request.requested_time && ` at ${request.requested_time}`}
                            </span>
                            {request.venue?.capacity_min && request.venue?.capacity_max && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {request.venue.capacity_min}-{request.venue.capacity_max}
                              </span>
                            )}
                          </div>
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
                      {request.status === 'accepted' && (
                        <div className="flex flex-wrap gap-2">
                          {new Date(request.requested_date) < new Date() && (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCompleteDialog(request.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark as Completed
                            </Button>
                          )}
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleOpenCancelDialog(request.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel Booking
                          </Button>
                        </div>
                      )}
                      {request.status === 'completed' && (request as any).completion_notes && (
                        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Completion Notes</p>
                          <p className="text-sm text-foreground">"{(request as any).completion_notes}"</p>
                        </div>
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

        {/* Payment Setup */}
        {artist && (
          <div className="mt-6">
            <StripeConnectSetup artistId={artist.id} />
          </div>
        )}

        {/* My Disputes */}
        <div className="mt-6">
          <UserDisputes />
        </div>

        {/* EPK / Press Kit Upload */}
        {artist && (
          <div className="mt-6">
            <ArtistEPKUpload artistId={artist.id} />
          </div>
        )}

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

      {/* Cancel Booking Dialog */}
      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        isSubmitting={isCancelling}
        bookingDate={cancellingBookingId ? bookingRequests.find(r => r.id === cancellingBookingId)?.requested_date ? format(new Date(bookingRequests.find(r => r.id === cancellingBookingId)!.requested_date), 'MMMM d, yyyy') : undefined : undefined}
        otherPartyName={cancellingBookingId ? bookingRequests.find(r => r.id === cancellingBookingId)?.venue?.venue_name : undefined}
      />

      {/* Complete Booking Dialog */}
      <CompleteBookingDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        onConfirm={handleConfirmComplete}
        isSubmitting={isCompleting}
        bookingDate={completingBookingId ? bookingRequests.find(r => r.id === completingBookingId)?.requested_date ? format(new Date(bookingRequests.find(r => r.id === completingBookingId)!.requested_date), 'MMMM d, yyyy') : undefined : undefined}
        otherPartyName={completingBookingId ? bookingRequests.find(r => r.id === completingBookingId)?.venue?.venue_name : undefined}
      />
    </div>
  );
};

export default ArtistDashboard;
