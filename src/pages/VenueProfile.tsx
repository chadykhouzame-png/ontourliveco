import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, MapPin, Users, Music, Calendar, Instagram, ExternalLink, ArrowLeft, LogOut, MessageSquare } from 'lucide-react';
import { Venue, GENRE_LABELS, VENUE_TYPE_LABELS } from '@/types/database';
import { RatingDisplay } from '@/components/StarRating';
import { ReviewsList, Review } from '@/components/ReviewsList';
import { useRecordProfileView } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

const VenueProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { recordView } = useRecordProfileView();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [artistProfile, setArtistProfile] = useState<{ id: string } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVenue = async () => {
      if (!id) return;
      
      const { data: venueData, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !venueData) {
        navigate('/');
        return;
      }
      
      setVenue(venueData as Venue);
      
      // Fetch reviews for this venue
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
        .eq('reviewee_venue_id', id)
        .order('created_at', { ascending: false });
      
      if (reviewsData && reviewsData.length > 0) {
        // Fetch reviewer names
        const artistIds = reviewsData
          .filter(r => r.reviewer_type === 'artist' && r.reviewer_artist_id)
          .map(r => r.reviewer_artist_id!);
        
        const { data: artists } = artistIds.length > 0 
          ? await supabase.from('artists').select('id, artist_name').in('id', artistIds)
          : { data: [] as { id: string; artist_name: string }[] };
        
        const artistMap = new Map<string, string>(
          (artists || []).map(a => [a.id, a.artist_name])
        );
        
        const formattedReviews: Review[] = reviewsData.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewer_name: r.reviewer_type === 'artist' 
            ? (artistMap.get(r.reviewer_artist_id!) || 'Artist')
            : 'Venue',
          reviewer_type: r.reviewer_type as 'artist' | 'venue',
        }));
        
        setReviews(formattedReviews);
      }
      
      // Get artist profile if user is an artist
      if (user && userRole === 'artist') {
        const { data: artistData } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setArtistProfile(artistData);
      }
      
      setIsLoading(false);
    };
    
    fetchVenue();
  }, [id, navigate, user, userRole]);

  // Record profile view
  useEffect(() => {
    if (id && venue && user?.id !== venue.user_id) {
      recordView('venue', id);
    }
  }, [id, venue, user, recordView]);

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

  if (!venue) {
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
              <Button onClick={() => navigate('/join/artist')} className="ios-press">
                Join as Artist
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
              <div className="h-32 bg-gradient-to-br from-venue/40 via-venue/20 to-transparent" />
              <CardContent className="relative pt-0">
                <div className="w-24 h-24 rounded-2xl bg-venue/20 backdrop-blur-sm flex items-center justify-center -mt-12 border-4 border-card shadow-ios">
                  <Building2 className="w-12 h-12 text-venue" />
                </div>
                <div className="mt-4">
                  <h1 className="text-3xl font-bold tracking-tight">{venue.venue_name}</h1>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {venue.city}
                  </p>
                  {/* Rating Display */}
                  <div className="mt-3">
                    <RatingDisplay 
                      rating={(venue as any).average_rating} 
                      totalReviews={(venue as any).total_reviews || 0}
                      size="md"
                    />
                  </div>
                </div>

                {/* Venue Type Badge */}
                <div className="mt-4">
                  <Badge className="bg-venue/20 text-venue border-0 rounded-full px-3">
                    {VENUE_TYPE_LABELS[venue.venue_type]}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {venue.description && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground leading-relaxed">{venue.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Music Preferences */}
            {venue.music_preferences && venue.music_preferences.length > 0 && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-xl bg-venue/20 flex items-center justify-center">
                      <Music className="w-4 h-4 text-venue" />
                    </div>
                    Music Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {venue.music_preferences.map((genre) => (
                      <Badge key={genre} variant="outline" className="border-venue/30 text-venue rounded-full px-3">
                        {GENRE_LABELS[genre]}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equipment Notes */}
            {venue.equipment_notes && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="text-lg">Equipment & Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground leading-relaxed">{venue.equipment_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            <ReviewsList 
              reviews={reviews} 
              emptyMessage="No reviews yet for this venue"
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Venue Details */}
            <Card className="glass border-border/50 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-secondary/20">
                <CardTitle className="text-lg">Venue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Capacity */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30">
                  <div className="w-10 h-10 rounded-xl bg-venue/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-venue" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="font-semibold">
                      {venue.capacity_min} - {venue.capacity_max} guests
                    </p>
                  </div>
                </div>

                {/* Booking Nights */}
                {venue.booking_nights && venue.booking_nights.length > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30">
                    <div className="w-10 h-10 rounded-xl bg-venue/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-venue" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">Booking Nights</p>
                      <div className="flex flex-wrap gap-1.5">
                        {venue.booking_nights.map((night) => (
                          <Badge key={night} variant="secondary" className="text-xs rounded-full">
                            {night}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {venue.instagram_url && (
              <Card className="glass border-border/50 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-border/30 bg-secondary/20">
                  <CardTitle className="text-lg">Links</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <a 
                    href={venue.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30 hover:bg-secondary/50 transition-all duration-200 haptic"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="flex-1 font-medium">Instagram</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Message CTA for Artists */}
            {userRole === 'artist' && artistProfile ? (
              <Button 
                className="w-full bg-primary hover:bg-primary/90 haptic shadow-lg"
                size="lg"
                onClick={() => navigate(`/messages?artist=${artistProfile.id}&venue=${venue.id}`)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            ) : !user ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground text-sm mb-4">
                    Want to connect with this venue?
                  </p>
                  <Button 
                    onClick={() => navigate('/join/artist')}
                    className="w-full ios-press"
                  >
                    Join as an Artist
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

export default VenueProfile;