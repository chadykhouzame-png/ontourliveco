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
import { Building2, Search, Calendar, MessageSquare, Settings, LogOut, Star, CheckCircle, XCircle, Music, Plus, DollarSign, BarChart3, Shield, FileText } from 'lucide-react';
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
import UserDisputes from '@/components/UserDisputes';
import PayBookingButton from '@/components/PayBookingButton';
import { BookingStatusFilter, StatusFilter } from '@/components/BookingStatusFilter';
import CancelBookingDialog from '@/components/CancelBookingDialog';
import CompleteBookingDialog from '@/components/CompleteBookingDialog';
import BookingDetailModal from '@/components/BookingDetailModal';
import { useBookingNotifications } from '@/hooks/useBookingNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import StripeReturnBanner from '@/components/StripeReturnBanner';
import { BrandLockup } from '@/components/BrandLockup';
import { ThemeToggle } from '@/components/ThemeToggle';
const VenueDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { showErrorWithTitle, executeWithRetry } = useErrorHandler();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [entertainmentRequests, setEntertainmentRequests] = useState<EntertainmentRequest[]>([]);
  const [existingReviews, setExistingReviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  
  // Entertainment request dialog state
  const [entertainmentDialogOpen, setEntertainmentDialogOpen] = useState(false);
  
  // Update offer dialog state
  const [updateOfferDialogOpen, setUpdateOfferDialogOpen] = useState(false);
  const [newOfferAmount, setNewOfferAmount] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  
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

  // Booking detail modal state
  const [detailBooking, setDetailBooking] = useState<BookingRequest | null>(null);
  
  // Negotiation limit check
  const { hasReachedLimit, remainingRounds, roundCount } = useNegotiationLimit(selectedBooking?.id);
  
  // Sound and browser notifications for new bookings
  useBookingNotifications({ 
    entityId: venue?.id, 
    entityType: 'venue',
    enabled: !!venue?.id 
  });

  // Unread message count for Messages button
  const { unreadCount } = useUnreadMessages({
    entityId: venue?.id,
    entityType: 'venue',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/join/venue');
    }

    // Payment-return outcomes are now surfaced via <StripeReturnBanner /> below,
    // which reads the same query params and renders a dismissible banner.
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
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Get venue profile with retry
        const venueData = await executeWithRetry(async () => {
          const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) throw error;
          return data;
        }, 'fetching venue profile');
        
        if (!venueData) {
          navigate('/venue/setup');
          return;
        }
        
        setVenue(venueData as Venue);
        
        // Fetch remaining data in parallel with retry
        const [requests, entRequests, reviews] = await Promise.all([
          // Get booking requests with artist info
          executeWithRetry(async () => {
            const { data, error } = await supabase
              .from('booking_requests')
              .select('*, artist:artists(*)')
              .eq('venue_id', venueData.id)
              .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
          }, 'fetching booking requests'),
          
          // Get entertainment requests
          executeWithRetry(async () => {
            const { data, error } = await supabase
              .from('entertainment_requests')
              .select('*')
              .eq('venue_id', venueData.id)
              .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
          }, 'fetching entertainment requests'),
          
          // Get existing reviews by this venue
          executeWithRetry(async () => {
            const { data, error } = await supabase
              .from('reviews')
              .select('booking_request_id')
              .eq('reviewer_type', 'venue')
              .eq('reviewer_venue_id', venueData.id);
            
            if (error) throw error;
            return data || [];
          }, 'fetching reviews'),
        ]);
        
        setBookingRequests(requests as BookingRequest[]);
        setEntertainmentRequests(entRequests as EntertainmentRequest[]);
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
    if (!venue?.id) return;

    const channel = supabase
      .channel(`venue-bookings-${venue.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `venue_id=eq.${venue.id}`,
        },
        async (payload) => {
          console.log('Realtime booking update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the new request with artist info
            const { data } = await supabase
              .from('booking_requests')
              .select('*, artist:artists(*)')
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
            // Fetch the updated request with artist info
            const { data } = await supabase
              .from('booking_requests')
              .select('*, artist:artists(*)')
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
  }, [venue?.id, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
        description: "You can now leave a review for the artist.",
      });
      setCompleteDialogOpen(false);
    } catch (error) {
      showErrorWithTitle(error, "Error marking booking complete", 'mark-complete');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleOpenCancelDialog = (bookingId: string) => {
    setCancellingBookingId(bookingId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancellingBookingId || !venue) return;
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
            sender_name: venue.venue_name,
            recipient_user_id: request.artist?.user_id,
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
        description: "The artist has been notified of the cancellation.",
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
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('booking_requests')
          .update({ 
            status: 'accepted' as BookingStatus,
            offer_amount: booking.counter_offer 
          })
          .eq('id', booking.id);
        
        if (error) throw error;
      }, 'accepting counter-offer');
      
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

  const handleAcceptDeclineRequest = async (requestId: string, status: BookingStatus) => {
    const request = bookingRequests.find(r => r.id === requestId);
    if (!request || !venue) return;

    try {
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('booking_requests')
          .update({ status })
          .eq('id', requestId);
        
        if (error) throw error;
      }, 'updating booking status');
      
      // Update local state
      setBookingRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status } : req
      ));
      
      // Send notification to artist
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: status,
            booking_request_id: requestId,
            sender_name: venue.venue_name,
            recipient_user_id: request.artist?.user_id,
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
        'venue',
        status === 'accepted' ? 'accept' : 'decline',
        request.offer_amount || undefined
      );
      
      toast({
        title: status === 'accepted' ? "Booking accepted!" : "Booking declined",
        description: status === 'accepted' 
          ? "The artist has been notified." 
          : "The artist has been notified of your decision.",
      });
    } catch (error) {
      showErrorWithTitle(error, "Error updating booking", 'update-booking-status');
    }
  };

  const handleSubmitUpdatedOffer = async () => {
    if (!selectedBooking || !newOfferAmount || !venue) return;
    
    setIsSubmittingOffer(true);
    
    try {
      // Update the offer and clear the artist's counter-offer so they can respond again
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('booking_requests')
          .update({ 
            offer_amount: parseInt(newOfferAmount),
            counter_offer: null  // Clear previous counter so artist can respond to new offer
          })
          .eq('id', selectedBooking.id);
        
        if (error) throw error;
      }, 'updating offer');
      
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

  // Computed values - must be before any early returns for hook consistency
  const pendingRequests = bookingRequests.filter(r => r.status === 'pending');
  const acceptedRequests = bookingRequests.filter(r => r.status === 'accepted');
  const completedRequests = bookingRequests.filter(r => r.status === 'completed');
  const declinedRequests = bookingRequests.filter(r => r.status === 'declined');
  const upcomingBookings = acceptedRequests.filter(r => new Date(r.requested_date) >= new Date());
  const pastAcceptedBookings = acceptedRequests.filter(r => new Date(r.requested_date) < new Date());
  
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
          <BrandLockup size="md" lazy={false} />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground hidden sm:block">
              {venue?.venue_name}
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <StripeReturnBanner mode="venue" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              {pendingRequests.length > 0 && (
                <Badge className="bg-artist text-artist-foreground animate-pulse">
                  {pendingRequests.length} pending
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Welcome back, {venue?.venue_name}</p>
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
            <Button onClick={() => navigate('/search')} className="bg-artist hover:bg-artist/90 haptic shadow-lg shadow-artist/20">
              <Search className="w-4 h-4 mr-2" />
              Browse Artists
            </Button>
            <Button variant="outline" onClick={() => navigate('/venue/setup')} className="haptic glass-subtle">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              onClick={() => setEntertainmentDialogOpen(true)} 
              variant="outline"
              className="haptic glass-subtle"
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
                      <div className="flex items-center gap-2">
                        {booking.payment_status === 'paid' ? (
                          <Badge className="bg-champagne text-noir hover:bg-champagne-deep">Paid</Badge>
                        ) : (
                          <PayBookingButton
                            bookingId={booking.id}
                            amount={booking.counter_offer || booking.offer_amount || 0}
                            paymentStatus={booking.payment_status}
                          />
                        )}
                        <Badge className="bg-venue text-venue-foreground">Confirmed</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Requests */}
          <Card className="glass border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-secondary/20 space-y-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-artist" />
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
                    Search for artists or wait for artists to reach out
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
                            to={`/artist/${request.artist_id}`}
                            className="font-medium hover:text-artist hover:underline transition-colors"
                          >
                            {request.artist?.artist_name || 'Unknown Artist'}
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
                              Offer: ${request.offer_amount.toLocaleString()}
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
                      {/* Actions for pending requests */}
                      {request.status === 'pending' && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {request.counter_offer ? (
                            // Venue responding to artist's counter-offer
                            <>
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
                              <Button 
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => handleAcceptDeclineRequest(request.id, 'declined')}
                              >
                                Decline
                              </Button>
                            </>
                          ) : (
                            // Venue accepting or declining initial offer/request
                            <>
                              <Button 
                                size="sm"
                                className="bg-venue hover:bg-venue/90"
                                onClick={() => handleAcceptDeclineRequest(request.id, 'accepted')}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenUpdateOffer(request)}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Counter Offer
                              </Button>
                              <Button 
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => handleAcceptDeclineRequest(request.id, 'declined')}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      {request.status === 'accepted' && (
                        <div className="flex flex-wrap gap-2">
                          <PayBookingButton
                            bookingId={request.id}
                            amount={request.counter_offer || request.offer_amount || 0}
                            paymentStatus={(request as any).payment_status}
                          />
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
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-muted-foreground"
                          onClick={() => setDetailBooking(request)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>
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

      {/* My Disputes */}
      <div className="mt-6">
        <UserDisputes />
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

      {/* Cancel Booking Dialog */}
      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        isSubmitting={isCancelling}
        bookingDate={cancellingBookingId ? bookingRequests.find(r => r.id === cancellingBookingId)?.requested_date ? format(new Date(bookingRequests.find(r => r.id === cancellingBookingId)!.requested_date), 'MMMM d, yyyy') : undefined : undefined}
        otherPartyName={cancellingBookingId ? bookingRequests.find(r => r.id === cancellingBookingId)?.artist?.artist_name : undefined}
      />

      {/* Complete Booking Dialog */}
      <CompleteBookingDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        onConfirm={handleConfirmComplete}
        isSubmitting={isCompleting}
        bookingDate={completingBookingId ? bookingRequests.find(r => r.id === completingBookingId)?.requested_date ? format(new Date(bookingRequests.find(r => r.id === completingBookingId)!.requested_date), 'MMMM d, yyyy') : undefined : undefined}
        otherPartyName={completingBookingId ? bookingRequests.find(r => r.id === completingBookingId)?.artist?.artist_name : undefined}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        open={!!detailBooking}
        onOpenChange={(open) => !open && setDetailBooking(null)}
        booking={detailBooking}
        currentUserType="venue"
      />
    </div>
  );
};

export default VenueDashboard;
