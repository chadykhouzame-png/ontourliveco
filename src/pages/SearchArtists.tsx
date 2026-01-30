import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search as SearchIcon, MapPin, Calendar as CalendarIcon, Music, Instagram, Filter, X, LogOut, DollarSign } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Artist, TravelDate, Genre, GENRE_LABELS } from '@/types/database';
import { RatingDisplay } from '@/components/StarRating';

interface ArtistWithTravel extends Artist {
  travel_dates: TravelDate[];
  matchingDates?: TravelDate[];
}

const GENRES: Genre[] = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats',
  'amapiano', 'latin', 'pop', 'rock', 'jazz', 'soul', 'funk',
  'drum_and_bass', 'uk_garage', 'reggae', 'dancehall', 'other'
];

const SearchArtists = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, isLoading: authLoading } = useAuth();
  
  const [city, setCity] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [feeRange, setFeeRange] = useState<[number, number]>([0, 10000]);
  const [filterByFee, setFilterByFee] = useState(false);
  
  const [artists, setArtists] = useState<ArtistWithTravel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      // Get all artists with their travel dates
      let query = supabase
        .from('artists')
        .select('*, travel_dates(*)')
        .eq('is_profile_complete', true);

      const { data, error } = await query;

      if (error) throw error;

      let results = (data || []) as ArtistWithTravel[];

      // Filter by city (check both primary_city and travel_dates)
      if (city.trim()) {
        const cityLower = city.trim().toLowerCase();
        results = results.filter(artist => {
          const primaryMatch = artist.primary_city.toLowerCase().includes(cityLower);
          const travelMatch = artist.travel_dates?.some(td => 
            td.city.toLowerCase().includes(cityLower)
          );
          return primaryMatch || travelMatch;
        });

        // Add matching travel dates for display
        results = results.map(artist => ({
          ...artist,
          matchingDates: artist.travel_dates?.filter(td => 
            td.city.toLowerCase().includes(cityLower) &&
            new Date(td.end_date) >= new Date()
          ) || []
        }));
      }

      // Filter by date
      if (selectedDate) {
        const searchDate = format(selectedDate, 'yyyy-MM-dd');
        results = results.filter(artist => 
          artist.travel_dates?.some(td => 
            searchDate >= td.start_date && 
            searchDate <= td.end_date &&
            (!availableOnly || td.is_available)
          )
        );
      }

      // Filter by genres
      if (selectedGenres.length > 0) {
        results = results.filter(artist =>
          artist.genres?.some(genre => selectedGenres.includes(genre))
        );
      }

      // Filter by fee range
      if (filterByFee) {
        results = results.filter(artist => {
          // Only filter artists who show their fee range
          if (!artist.show_fee_range) return true;
          
          const artistMin = artist.fee_range_min ?? 0;
          const artistMax = artist.fee_range_max ?? Infinity;
          
          // Check if artist's fee range overlaps with selected range
          return artistMin <= feeRange[1] && artistMax >= feeRange[0];
        });
      }

      // Filter by availability only
      if (availableOnly && !selectedDate) {
        results = results.filter(artist =>
          artist.travel_dates?.some(td => 
            td.is_available && 
            new Date(td.end_date) >= new Date()
          )
        );
      }

      setArtists(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGenre = (genre: Genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const clearFilters = () => {
    setCity('');
    setSelectedDate(undefined);
    setSelectedGenres([]);
    setAvailableOnly(true);
    setFeeRange([0, 10000]);
    setFilterByFee(false);
    setArtists([]);
    setHasSearched(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tighter">
            <span className="text-primary">ON</span>
            <span className="text-foreground">TOUR</span>
          </Link>
          <div className="flex items-center gap-4">
            {user && userRole === 'venue' && (
              <Button variant="outline" onClick={() => navigate('/venue/dashboard')}>
                Dashboard
              </Button>
            )}
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Artists</h1>
          <p className="text-muted-foreground">
            Search by city and date to find artists who are in town and available
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                City
              </Label>
              <Input
                placeholder="e.g., Sydney, Melbourne..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    {selectedDate ? format(selectedDate, "PPP") : "Any date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="pointer-events-auto"
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex items-center gap-4 h-10">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={availableOnly}
                    onCheckedChange={setAvailableOnly}
                    id="available"
                  />
                  <Label htmlFor="available" className="text-sm cursor-pointer">
                    Available only
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Genres
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="invisible">Search</Label>
              <Button 
                onClick={handleSearch} 
                className="w-full bg-venue hover:bg-venue/90"
                disabled={isLoading}
              >
                <SearchIcon className="w-4 h-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Genre Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedGenres.includes(genre)
                        ? 'bg-artist text-artist-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {GENRE_LABELS[genre]}
                  </button>
                ))}
              </div>
              
              {/* Fee Range Filter */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Fee Range
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={filterByFee}
                      onCheckedChange={setFilterByFee}
                      id="filter-fee"
                    />
                    <Label htmlFor="filter-fee" className="text-sm cursor-pointer">
                      Filter by fee
                    </Label>
                  </div>
                </div>
                {filterByFee && (
                  <div className="space-y-3">
                    <Slider
                      value={feeRange}
                      onValueChange={(value) => setFeeRange(value as [number, number])}
                      min={0}
                      max={10000}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>${feeRange[0].toLocaleString()}</span>
                      <span>${feeRange[1].toLocaleString()}{feeRange[1] >= 10000 ? '+' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(city || selectedDate || selectedGenres.length > 0 || filterByFee) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {city && (
                <Badge variant="secondary" className="gap-1">
                  {city}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setCity('')} />
                </Badge>
              )}
              {selectedDate && (
                <Badge variant="secondary" className="gap-1">
                  {format(selectedDate, 'MMM d')}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDate(undefined)} />
                </Badge>
              )}
              {selectedGenres.map(genre => (
                <Badge key={genre} variant="secondary" className="gap-1">
                  {GENRE_LABELS[genre]}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleGenre(genre)} />
                </Badge>
              ))}
              {filterByFee && (
                <Badge variant="secondary" className="gap-1">
                  ${feeRange[0].toLocaleString()} - ${feeRange[1].toLocaleString()}{feeRange[1] >= 10000 ? '+' : ''}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterByFee(false)} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="mb-4">
            <p className="text-muted-foreground">
              {artists.length === 0 
                ? 'No artists found matching your criteria'
                : `${artists.length} ${artists.length === 1 ? 'artist' : 'artists'} found`
              }
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link key={artist.id} to={`/artist/${artist.id}`}>
              <Card className="bg-card border-border hover:border-artist/50 transition-all cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-artist/20 flex items-center justify-center flex-shrink-0">
                      <Music className="w-8 h-8 text-artist" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{artist.artist_name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {artist.primary_city}
                      </p>
                      <RatingDisplay 
                        rating={(artist as any).average_rating} 
                        totalReviews={(artist as any).total_reviews || 0}
                        size="sm"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Genres */}
                  {artist.genres && artist.genres.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {artist.genres.slice(0, 3).map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {GENRE_LABELS[genre]}
                        </Badge>
                      ))}
                      {artist.genres.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{artist.genres.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Travel Dates */}
                  {artist.matchingDates && artist.matchingDates.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-artist/10 border border-artist/20">
                      <p className="text-xs font-medium text-artist mb-1">In town:</p>
                      {artist.matchingDates.slice(0, 2).map((td) => (
                        <p key={td.id} className="text-sm">
                          {format(new Date(td.start_date), 'MMM d')} – {format(new Date(td.end_date), 'MMM d')}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Fee Range */}
                  {(artist.fee_range_min || artist.fee_range_max) && (
                    <div className="mt-3 flex items-center gap-2 text-primary">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">
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

                  {/* Social Link */}
                  {artist.instagram_url && (
                    <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                      <Instagram className="w-4 h-4" />
                      <span className="text-sm truncate">
                        {artist.instagram_url.replace('https://instagram.com/', '@')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {!hasSearched && (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold mb-2">Search for artists</h3>
            <p className="text-muted-foreground">
              Enter a city and date to find artists who are available
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchArtists;
