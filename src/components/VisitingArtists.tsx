import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Calendar, Music, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { GENRE_LABELS, Genre } from '@/types/database';

interface VisitingArtist {
  id: string;
  artist_id: string;
  city: string;
  start_date: string;
  end_date: string;
  artist: {
    id: string;
    artist_name: string;
    primary_city: string;
    profile_image_url: string | null;
    genres: Genre[] | null;
    average_rating: number | null;
    fee_range_min: number | null;
    fee_range_max: number | null;
    show_fee_range: boolean | null;
  };
}

interface VisitingArtistsProps {
  venueCity: string;
}

const VisitingArtists = ({ venueCity }: VisitingArtistsProps) => {
  const [visitingArtists, setVisitingArtists] = useState<VisitingArtist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVisitingArtists = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDaysOut = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      
      // Normalize city for comparison (lowercase, trim)
      const normalizedCity = venueCity.toLowerCase().trim();
      
      // Fetch travel dates that overlap with the next 30 days in this city
      const { data, error } = await supabase
        .from('travel_dates')
        .select(`
          id,
          artist_id,
          city,
          start_date,
          end_date,
          artist:artists (
            id,
            artist_name,
            primary_city,
            profile_image_url,
            genres,
            average_rating,
            fee_range_min,
            fee_range_max,
            show_fee_range
          )
        `)
        .gte('end_date', today)
        .lte('start_date', thirtyDaysOut)
        .eq('is_available', true)
        .order('start_date', { ascending: true });
      
      if (!error && data) {
        // Filter by city (case-insensitive, partial match)
        const filtered = data.filter(td => 
          td.city.toLowerCase().includes(normalizedCity) || 
          normalizedCity.includes(td.city.toLowerCase())
        );
        setVisitingArtists(filtered as unknown as VisitingArtist[]);
      }
      
      setIsLoading(false);
    };

    if (venueCity) {
      fetchVisitingArtists();
    }
  }, [venueCity]);

  if (isLoading) {
    return (
      <Card className="glass border-border/50 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/10 to-artist/10">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Artists Visiting Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visitingArtists.length === 0) {
    return (
      <Card className="glass border-border/50 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/10 to-artist/10">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Artists Visiting Soon
          </CardTitle>
          <CardDescription>
            Artists touring through your city in the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground py-4">
            No artists are currently planning to visit your city in the next 30 days.
          </p>
          <div className="text-center">
            <Button variant="outline" asChild className="haptic">
              <Link to="/search">
                Browse All Artists
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-primary/10 to-artist/10">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Artists Visiting Soon
          <Badge variant="secondary" className="ml-2">
            {visitingArtists.length} match{visitingArtists.length !== 1 ? 'es' : ''}
          </Badge>
        </CardTitle>
        <CardDescription>
          These artists are touring through your city soon — perfect for booking!
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {visitingArtists.slice(0, 5).map((visit) => (
            <Link
              key={visit.id}
              to={`/artist/${visit.artist.id}`}
              className="block"
            >
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 hover:border-primary/30 transition-all group">
                <Avatar className="w-14 h-14 border-2 border-artist/30">
                  <AvatarImage src={visit.artist.profile_image_url || undefined} />
                  <AvatarFallback className="bg-artist/20 text-artist font-bold">
                    {visit.artist.artist_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {visit.artist.artist_name}
                    </h4>
                    {visit.artist.average_rating && (
                      <Badge variant="outline" className="text-xs">
                        ★ {visit.artist.average_rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {format(parseISO(visit.start_date), 'MMM d')} - {format(parseISO(visit.end_date), 'MMM d')}
                    </span>
                  </div>
                  
                  {visit.artist.genres && visit.artist.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {visit.artist.genres.slice(0, 3).map(genre => (
                        <Badge 
                          key={genre} 
                          variant="secondary" 
                          className="text-xs bg-artist/10 text-artist border-0"
                        >
                          {GENRE_LABELS[genre]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-right shrink-0">
                  {visit.artist.show_fee_range && visit.artist.fee_range_min && (
                    <p className="text-sm font-medium text-primary">
                      From ${visit.artist.fee_range_min.toLocaleString()}
                    </p>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {visitingArtists.length > 5 && (
          <div className="text-center mt-4">
            <Button variant="ghost" asChild className="haptic">
              <Link to="/search">
                View all {visitingArtists.length} artists
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitingArtists;
