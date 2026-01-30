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
import { Music, MapPin, Calendar as CalendarIcon, Instagram, ExternalLink, ArrowLeft, Send, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Artist, TravelDate, Venue, GENRE_LABELS } from '@/types/database';
import { SocialStatsDisplay, SocialPlatform } from '@/components/SocialConnectButton';
import { RatingDisplay } from '@/components/StarRating';

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
  
  const [artist, setArtist] = useState<Artist | null>(null);
  const [travelDates, setTravelDates] = useState<TravelDate[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
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
      
      // Get social connections
      const { data: connections } = await supabase
        .from('social_connections')
        .select('*')
        .eq('artist_id', id)
        .eq('is_connected', true);
      
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
      const { error } = await supabase
        .from('booking_requests')
        .insert({
          artist_id: artist.id,
          venue_id: venue.id,
          requested_date: format(bookingDate, 'yyyy-MM-dd'),
          requested_time: bookingTime || null,
          message: bookingMessage.trim() || null,
          offer_amount: offerAmount ? parseInt(offerAmount) : null,
        });

      if (error) throw error;

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
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tighter">
            <span className="text-primary">ON</span>
            <span className="text-foreground">TOUR</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => navigate('/join/venue')}>
                Join as Venue
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            <Card className="bg-card border-border overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-artist/30 to-artist/10" />
              <CardContent className="relative pt-0">
                <div className="w-24 h-24 rounded-2xl bg-artist/20 flex items-center justify-center -mt-12 border-4 border-card">
                  <Music className="w-12 h-12 text-artist" />
                </div>
                <div className="mt-4">
                  <h1 className="text-3xl font-bold">{artist.artist_name}</h1>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {artist.primary_city}
                  </p>
                  {/* Rating Display */}
                  <div className="mt-2">
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
                      <Badge key={genre} className="bg-artist/20 text-artist border-0">
                        {GENRE_LABELS[genre]}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bio */}
            {artist.bio && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{artist.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Social Stats */}
            {socialConnections.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Social Stats</CardTitle>
                  <CardDescription>Verified follower counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialStatsDisplay connections={socialConnections} />
                </CardContent>
              </Card>
            )}

            {/* Social Links (legacy URLs) */}
            {(artist.instagram_url || artist.soundcloud_url || artist.spotify_url) && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {artist.instagram_url && (
                    <a 
                      href={artist.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                      <span className="flex-1">Instagram</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {artist.soundcloud_url && (
                    <a 
                      href={artist.soundcloud_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <Music className="w-5 h-5" />
                      <span className="flex-1">SoundCloud</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                  {artist.spotify_url && (
                    <a 
                      href={artist.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <Music className="w-5 h-5" />
                      <span className="flex-1">Spotify</span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Travel Dates */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-artist" />
                  Upcoming Travel
                </CardTitle>
                <CardDescription>
                  {travelDates.length === 0 
                    ? "No travel dates listed"
                    : "When and where they'll be"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {travelDates.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No upcoming travel dates
                  </p>
                ) : (
                  <div className="space-y-3">
                    {travelDates.map((td) => (
                      <div 
                        key={td.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          td.is_available ? "border-artist/30 bg-artist/5" : "border-border"
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
                            <Badge variant="outline" className="text-xs border-artist text-artist">
                              Available
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(td.start_date), 'MMM d')} – {format(new Date(td.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking CTA */}
            {userRole === 'venue' && venue ? (
              <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-venue hover:bg-venue/90" size="lg">
                    <Send className="w-4 h-4 mr-2" />
                    Send Booking Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card">
                  <DialogHeader>
                    <DialogTitle>Book {artist.artist_name}</DialogTitle>
                    <DialogDescription>
                      Send a booking request for your venue
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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
                            {bookingDate ? format(bookingDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={bookingDate}
                            onSelect={setBookingDate}
                            initialFocus
                            className="pointer-events-auto"
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Time (optional)</Label>
                      <Input
                        placeholder="e.g., 9 PM - 2 AM"
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
                          placeholder="500"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Message (optional)</Label>
                      <Textarea
                        placeholder="Tell them about the event, vibe, what you're looking for..."
                        value={bookingMessage}
                        onChange={(e) => setBookingMessage(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <Button 
                      onClick={handleSendBookingRequest}
                      className="w-full bg-venue hover:bg-venue/90"
                      disabled={isSubmitting || !bookingDate}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Request'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : !user ? (
              <Card className="bg-card border-border">
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    Want to book this artist?
                  </p>
                  <Button onClick={() => navigate('/join/venue')}>
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
