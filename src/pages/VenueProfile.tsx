import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, MapPin, Users, Music, Calendar, Instagram, ExternalLink, ArrowLeft, LogOut } from 'lucide-react';
import { Venue, GENRE_LABELS, VENUE_TYPE_LABELS } from '@/types/database';
import { RatingDisplay } from '@/components/StarRating';

const VenueProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [venue, setVenue] = useState<Venue | null>(null);
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
      setIsLoading(false);
    };
    
    fetchVenue();
  }, [id, navigate]);

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
              <Button onClick={() => navigate('/join/artist')}>
                Join as Artist
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
              <div className="h-32 bg-gradient-to-r from-venue/30 to-venue/10" />
              <CardContent className="relative pt-0">
                <div className="w-24 h-24 rounded-2xl bg-venue/20 flex items-center justify-center -mt-12 border-4 border-card">
                  <Building2 className="w-12 h-12 text-venue" />
                </div>
                <div className="mt-4">
                  <h1 className="text-3xl font-bold">{venue.venue_name}</h1>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    {venue.city}
                  </p>
                  {/* Rating Display */}
                  <div className="mt-2">
                    <RatingDisplay 
                      rating={(venue as any).average_rating} 
                      totalReviews={(venue as any).total_reviews || 0}
                      size="md"
                    />
                  </div>
                </div>

                {/* Venue Type Badge */}
                <div className="mt-4">
                  <Badge className="bg-venue/20 text-venue border-0">
                    {VENUE_TYPE_LABELS[venue.venue_type]}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {venue.description && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{venue.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Music Preferences */}
            {venue.music_preferences && venue.music_preferences.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-venue" />
                    Music Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {venue.music_preferences.map((genre) => (
                      <Badge key={genre} variant="outline" className="border-venue/30 text-venue">
                        {GENRE_LABELS[genre]}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equipment Notes */}
            {venue.equipment_notes && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Equipment & Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{venue.equipment_notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Venue Details */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Venue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Capacity */}
                {(venue.capacity_min || venue.capacity_max) && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-venue/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-venue" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity</p>
                      <p className="font-medium">
                        {venue.capacity_min && venue.capacity_max 
                          ? `${venue.capacity_min} - ${venue.capacity_max}`
                          : venue.capacity_min || venue.capacity_max
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Booking Nights */}
                {venue.booking_nights && venue.booking_nights.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-venue/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-venue" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Booking Nights</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {venue.booking_nights.map((night) => (
                          <Badge key={night} variant="secondary" className="text-xs">
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
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href={venue.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="flex-1">Instagram</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueProfile;
