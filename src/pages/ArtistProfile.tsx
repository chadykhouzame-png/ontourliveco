import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Music, MapPin, Calendar as CalendarIcon, Instagram, ExternalLink, ArrowLeft, Send, LogOut, DollarSign, MessageSquare } from 'lucide-react';
import DisputeSubmitDialog from '@/components/DisputeSubmitDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRecordProfileView } from '@/hooks/useAnalytics';
import { Artist, TravelDate, Venue, GENRE_LABELS } from '@/types/database';
import { SocialStatsDisplay, SocialPlatform } from '@/components/SocialConnectButton';
import { RatingDisplay } from '@/components/StarRating';
import { ReviewsList, Review } from '@/components/ReviewsList';
import ArtistAvailabilityCalendar from '@/components/ArtistAvailabilityCalendar';
import ArtistEPKGallery from '@/components/ArtistEPKGallery';

type SocialConnection = {
  platform: SocialPlatform;
  platform_username?: string | null;
  follower_count?: number | null;
  is_connected: boolean;
  profile_url?: string | null;
};

const ArtistProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const { recordView } = useRecordProfileView();
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [travelDates, setTravelDates] = useState<TravelDate[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Booking form
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      // Get artist
      const { data: artistData, error: artistError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', id)
        .single();
      
      if (artistError || !artistData) {
        navigate('/search');
        return;
      }
      
      setArtist(artistData as Artist);
      
      // Get social connections from public view (excludes sensitive OAuth tokens)
      const { data: connections } = await supabase
        .from('social_connections_public')
        .select('*')
        .eq('artist_id', id);
      
      if (connections) {
        setSocialConnections(connections.map(conn => ({
          platform: conn.platform as SocialPlatform,
          platform_username: conn.platform_username,
          follower_count: conn.follower_count,
          is_connected: conn.is_connected,
          profile_url: conn.profile_url,
        })));
      }
      
      // Get travel dates
      const { data: dates } = await supabase
        .from('travel_dates')
        .select('*')
        .eq('artist_id', id)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true });
      
      setTravelDates(dates || []);
      
      // Fetch reviews for this artist
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer_type,
          reviewer_artist_id,
          reviewer_venue_id
        `)
        .eq('reviewee_artist_id', id)
        .order('created_at', { ascending: false });
      
      if (reviewsData && reviewsData.length > 0) {
        // Fetch reviewer names (venues who reviewed this artist)
        const venueIds = reviewsData
          .filter(r => r.reviewer_type === 'venue' && r.reviewer_venue_id)
          .map(r => r.reviewer_venue_id!);
        
        const { data: venues } = venueIds.length > 0 
          ? await supabase.from('venues').select('id, venue_name').in('id', venueIds)
          : { data: [] as { id: string; venue_name: string }[] };
        
        const venueMap = new Map<string, string>(
          (venues || []).map(v => [v.id, v.venue_name])
        );
        
        const formattedReviews: Review[] = reviewsData.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewer_name: r.reviewer_type === 'venue' 
            ? (venueMap.get(r.reviewer_venue_id!) || 'Venue')
            : 'Artist',
          reviewer_type: r.reviewer_type as 'artist' | 'venue',
        }));
        
        setReviews(formattedReviews);
      }
      
      // Get venue if user is a venue
      if (user && userRole === 'venue') {
        const { data: venueData } = await supabase
          .from('venues')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setVenue(venueData as Venue);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [id, user, userRole, navigate]);

  // Record profile view
  useEffect(() => {
    if (id && artist && user?.id !== artist.user_id) {
      recordView('artist', id);
    }
  }, [id, artist, user, recordView]);

  const handleSendBookingRequest = async () => {
    if (!venue || !artist || !bookingDate) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select a date for your booking request.",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const { data: insertedData, error } = await supabase
        .from('booking_requests')
        .insert({
          artist_id: artist.id,
          venue_id: venue.id,
          requested_date: format(bookingDate, 'yyyy-MM-dd'),
          requested_time: bookingTime || null,
          message: bookingMessage.trim() || null,
          offer_amount: offerAmount ? parseInt(offerAmount) : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to artist
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: {
            type: 'new_offer',
            booking_request_id: insertedData.id,
            sender_name: venue.venue_name,
            recipient_user_id: artist.user_id,
            requested_date: format(bookingDate, 'yyyy-MM-dd'),
            offer_amount: offerAmount ? parseInt(offerAmount) : undefined,
            message: bookingMessage.trim() || undefined,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
      }

      toast({
        title: "Booking request sent!",
        description: `Your request has been sent to ${artist.artist_name}.`,
      });
      
      setShowBookingDialog(false);
      setBookingDate(undefined);
      setBookingTime('');
      setBookingMessage('');
      setOfferAmount('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error sending request",
        description: error.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!artist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* iOS Glass Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tighter">
            <span className="text-primary">ON</span>
            <span className="text-foreground">TOUR</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="ios-press">
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => navigate('/join/venue')} className="ios-press">
                Join as Venue
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 stagger-children">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 ios-press"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Hero Card */}
            <Card className="glass border-border/50 rounded-2xl overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-artist/40 via-artist/20 to-transparent" />
              <CardContent className="relative pt-0">
                <div className="w-24 h-24 rounded-2xl bg-artist/20 backdrop-blur-sm flex items-center justify-center -mt-12 border-4 border-card shadow-ios">
                  <Music className="w-12 h-12 text-artist" />
                </div>
                <div className="mt-4">
                  <h1 className="text-3xl font-bold tracking-tight">{artist.artist_name}</h1>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {artist.primary_city}
                  </p>
                  {/* Rating Display */}
                  <div className="mt-3">
                    <RatingDisplay 
                      rating={(artist as any).average_rating} 
                      totalReviews={(artist as any).total_reviews || 0}
                      size="md"
                    />
                  </div>
                </div>

                {/* Genres */}
                {artist.genres && artist.genres.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {artist.genres.map((genre) => (
                      <Badge key={genre} className="bg-artist/20 text-artist border-0 rounded-full px-3">
                        {GENRE_LABELS[genre]}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Fee Range - Show rates or contact message */}
                {(artist.fee_range_min || artist.fee_range_max) && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-primary">
                      {artist.show_fee_range 
                        ? (artist.fee_range_min && artist.fee_range_max 
                            ? `$${artist.fee_range_min.toLocaleString()} - $${artist.fee_range_max.toLocaleString()}`
                            : artist.fee_range_min 
                              ? `From $${artist.fee_range_min.toLocaleString()}`
                              : `Up to $${artist.fee_range_max?.toLocaleString()}`
                          )
                        : 'Contact for rates'
                      }
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bio */}
            {artist.bio && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground leading-relaxed">{artist.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Social Stats */}
            {socialConnections.length > 0 && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="text-lg">Social Stats</CardTitle>
                  <CardDescription>Verified follower counts</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <SocialStatsDisplay connections={socialConnections} />
                </CardContent>
              </Card>
            )}

            {/* Social Links (legacy URLs) */}
            {(artist.instagram_url || artist.soundcloud_url || artist.spotify_url) && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="text-lg">Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {artist.instagram_url && (
                    <a 
                      href={artist.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30 hover:bg-secondary/50 transition-all duration-200 haptic"
                    >
                      <Instagram className="w-5 h-5" />
                      <span className="flex-1 font-medium">Instagram</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {artist.soundcloud_url && (
                    <a 
                      href={artist.soundcloud_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30 hover:bg-secondary/50 transition-all duration-200 haptic"
                    >
                      <Music className="w-5 h-5" />
                      <span className="flex-1 font-medium">SoundCloud</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {artist.spotify_url && (
                    <a 
                      href={artist.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30 hover:bg-secondary/50 transition-all duration-200 haptic"
                    >
                      <Music className="w-5 h-5" />
                      <span className="flex-1 font-medium">Spotify</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* EPK / Press Kit Gallery */}
            <ArtistEPKGallery artistId={artist.id} artistName={artist.artist_name} />

            {/* Reviews Section */}
            <ReviewsList 
              reviews={reviews} 
              emptyMessage="No reviews yet for this artist"
            />

            {/* Report Issue - Only show to logged-in users who are not the owner */}
            {user && user.id !== artist.user_id && (
              <div className="flex justify-center pt-4">
                <DisputeSubmitDialog
                  targetType="artist"
                  targetId={artist.id}
                  targetName={artist.artist_name}
                  userId={user.id}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Availability Calendar - Show to venue users */}
            {(userRole === 'venue' || !user) && travelDates.length > 0 && (
              <ArtistAvailabilityCalendar
                travelDates={travelDates}
                artistName={artist.artist_name}
                selectedDate={bookingDate}
                onDateSelect={(date) => {
                  setBookingDate(date);
                }}
              />
            )}

            {/* Travel Dates - Show to non-venue users or when no travel dates */}
            {(userRole !== 'venue' && user) && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-xl bg-artist/20 flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 text-artist" />
                    </div>
                    Upcoming Travel
                  </CardTitle>
                  <CardDescription>
                    {travelDates.length === 0 
                      ? "No travel dates listed"
                      : "When and where they'll be"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {travelDates.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-6">
                      No upcoming travel dates
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {travelDates.map((td) => (
                        <div 
                          key={td.id}
                          className={cn(
                            "p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 haptic",
                            td.is_available 
                              ? "border-artist/30 bg-artist/5 shadow-sm" 
                              : "border-border/30 bg-secondary/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className={cn(
                                "w-4 h-4",
                                td.is_available ? "text-artist" : "text-muted-foreground"
                              )} />
                              <span className="font-medium">{td.city}</span>
                            </div>
                            {td.is_available && (
                              <Badge variant="outline" className="text-xs border-artist text-artist rounded-full">
                                Available
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {format(new Date(td.start_date), 'MMM d')} – {format(new Date(td.end_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {userRole === 'venue' && venue ? (
              <div className="space-y-3">
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 haptic shadow-lg"
                  size="lg"
                  onClick={() => navigate(`/messages?artist=${artist.id}&venue=${venue.id}`)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-venue hover:bg-venue/90 haptic shadow-lg shadow-venue/20" size="lg" variant="outline">
                      <Send className="w-4 h-4 mr-2" />
                      Send Booking Request
                    </Button>
                  </DialogTrigger>
                <DialogContent className="glass border-border/50 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Book {artist.artist_name}</DialogTitle>
                    <DialogDescription>
                      Send a booking request from {venue.venue_name}
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Venue Rating Display */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                    <div>
                      <p className="font-medium">{venue.venue_name}</p>
                      <p className="text-sm text-muted-foreground">{venue.city}</p>
                    </div>
                    <RatingDisplay 
                      rating={(venue as any).average_rating} 
                      totalReviews={(venue as any).total_reviews || 0}
                      size="sm"
                    />
                  </div>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !bookingDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {bookingDate ? format(bookingDate, 'PPP') : 'Select a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={bookingDate}
                            onSelect={setBookingDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Time (optional)</Label>
                      <Input 
                        type="time" 
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Offer Amount (optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input 
                          type="number"
                          placeholder="0"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Message (optional)</Label>
                      <Textarea 
                        placeholder="Tell them about your event..."
                        value={bookingMessage}
                        onChange={(e) => setBookingMessage(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 ios-press"
                      onClick={() => setShowBookingDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-venue hover:bg-venue/90 ios-press"
                      onClick={handleSendBookingRequest}
                      disabled={isSubmitting || !bookingDate}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Request'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            ) : !user ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground text-sm mb-4">
                    Want to book this artist?
                  </p>
                  <Button 
                    onClick={() => navigate('/join/venue')}
                    className="w-full ios-press"
                  >
                    Join as a Venue
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfile;