import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search as SearchIcon, MapPin, Building2, Music, Instagram, Filter, X, LogOut, Users, Star, Calendar, Megaphone } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Venue, Genre, VenueType, GENRE_LABELS, VENUE_TYPE_LABELS } from '@/types/database';
import { RatingDisplay } from '@/components/StarRating';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { format } from 'date-fns';

interface EntertainmentRequest {
  id: string;
  venue_id: string;
  requested_date: string;
  start_time: string;
  end_time: string | null;
  preferred_genres: Genre[] | null;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
}

const GENRES: Genre[] = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats',
  'amapiano', 'latin', 'pop', 'rock', 'jazz', 'soul', 'funk',
  'drum_and_bass', 'uk_garage', 'reggae', 'dancehall', 'other'
];

const VENUE_TYPES: VenueType[] = [
  'bar', 'club', 'restaurant', 'hotel', 'rooftop', 'lounge',
  'festival', 'private_event', 'other'
];

const SearchVenues = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { showError } = useErrorHandler();
  
  const [city, setCity] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<VenueType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [capacityRange, setCapacityRange] = useState<[number, number]>([0, 2000]);
  const [filterByCapacity, setFilterByCapacity] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [filterByRating, setFilterByRating] = useState(false);
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [entertainmentRequests, setEntertainmentRequests] = useState<Map<string, EntertainmentRequest[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('venues')
        .select('*')
        .eq('is_profile_complete', true);

      const { data, error } = await query;

      if (error) throw error;

      let results = (data || []) as Venue[];

      // Filter by city
      if (city.trim()) {
        const cityLower = city.trim().toLowerCase();
        results = results.filter(venue => 
          venue.city.toLowerCase().includes(cityLower)
        );
      }

      // Filter by venue types
      if (selectedVenueTypes.length > 0) {
        results = results.filter(venue =>
          selectedVenueTypes.includes(venue.venue_type)
        );
      }

      // Filter by music preferences (genres)
      if (selectedGenres.length > 0) {
        results = results.filter(venue =>
          venue.music_preferences?.some(genre => selectedGenres.includes(genre))
        );
      }

      // Filter by capacity range
      if (filterByCapacity) {
        results = results.filter(venue => {
          const venueMin = venue.capacity_min ?? 0;
          const venueMax = venue.capacity_max ?? Infinity;
          
          // Check if venue's capacity overlaps with selected range
          return venueMin <= capacityRange[1] && venueMax >= capacityRange[0];
        });
      }

      // Filter by minimum rating
      if (filterByRating && minRating > 0) {
        results = results.filter(venue => {
          const rating = (venue as any).average_rating;
          if (rating === null || rating === undefined) {
            return minRating <= 1;
          }
          return rating >= minRating;
        });
      }

      // Fetch entertainment requests for found venues
      const venueIds = results.map(v => v.id);
      if (venueIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: requestsData } = await supabase
          .from('entertainment_requests')
          .select('*')
          .in('venue_id', venueIds)
          .eq('status', 'open')
          .gte('requested_date', today);

        // Group requests by venue_id
        const requestsMap = new Map<string, EntertainmentRequest[]>();
        (requestsData || []).forEach((req) => {
          const existing = requestsMap.get(req.venue_id) || [];
          existing.push(req as EntertainmentRequest);
          requestsMap.set(req.venue_id, existing);
        });
        setEntertainmentRequests(requestsMap);

        // Filter to show only venues with active requests if toggle is on
        if (showActiveOnly) {
          results = results.filter(venue => requestsMap.has(venue.id));
        }
      } else {
        setEntertainmentRequests(new Map());
      }

      setVenues(results);
    } catch (error) {
      showError(error, 'searching venues');
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

  const toggleVenueType = (type: VenueType) => {
    setSelectedVenueTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setCity('');
    setSelectedGenres([]);
    setSelectedVenueTypes([]);
    setCapacityRange([0, 2000]);
    setFilterByCapacity(false);
    setMinRating(0);
    setFilterByRating(false);
    setShowActiveOnly(false);
    setVenues([]);
    setEntertainmentRequests(new Map());
    setHasSearched(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const activeFiltersCount = [
    city,
    selectedGenres.length > 0,
    selectedVenueTypes.length > 0,
    filterByCapacity,
    filterByRating && minRating > 0,
    showActiveOnly,
  ].filter(Boolean).length;

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
            {user && userRole === 'artist' && (
              <Button variant="outline" onClick={() => navigate('/artist/dashboard')}>
                Dashboard
              </Button>
            )}
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Venues</h1>
          <p className="text-muted-foreground">
            Discover venues looking for artists in your area
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-3">
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
              <Label>Options</Label>
              <div className="flex items-center gap-4 h-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(activeFiltersCount > 0 && "text-artist")}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="invisible">Search</Label>
              <Button 
                onClick={handleSearch} 
                className="w-full bg-artist hover:bg-artist/90"
                disabled={isLoading}
              >
                <SearchIcon className="w-4 h-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* Venue Type Filter */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4" />
                  Venue Type
                </Label>
                <div className="flex flex-wrap gap-2">
                  {VENUE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleVenueType(type)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedVenueTypes.includes(type)
                          ? 'bg-venue text-venue-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {VENUE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Filter */}
              <div className="pt-4 border-t border-border">
                <Label className="flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4" />
                  Music Preferences
                </Label>
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
              </div>
              
              {/* Capacity Range Filter */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Capacity Range
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={filterByCapacity}
                      onCheckedChange={setFilterByCapacity}
                      id="filter-capacity"
                    />
                    <Label htmlFor="filter-capacity" className="text-sm cursor-pointer">
                      Filter by capacity
                    </Label>
                  </div>
                </div>
                {filterByCapacity && (
                  <div className="space-y-3">
                    <Slider
                      value={capacityRange}
                      onValueChange={(value) => setCapacityRange(value as [number, number])}
                      min={0}
                      max={2000}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{capacityRange[0]} guests</span>
                      <span>{capacityRange[1]}{capacityRange[1] >= 2000 ? '+' : ''} guests</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Rating Filter */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Minimum Rating
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={filterByRating}
                      onCheckedChange={setFilterByRating}
                      id="filter-rating"
                    />
                    <Label htmlFor="filter-rating" className="text-sm cursor-pointer">
                      Filter by rating
                    </Label>
                  </div>
                </div>
                {filterByRating && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setMinRating(rating)}
                          className={cn(
                            "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            minRating === rating
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          )}
                        >
                          {rating}
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs">+</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {minRating === 0 
                        ? "Select minimum rating" 
                        : minRating === 1 
                          ? "Showing all rated venues"
                          : `Showing venues with ${minRating}+ stars`
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Active Seeking Filter */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-artist" />
                    Actively Seeking Artists
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showActiveOnly}
                      onCheckedChange={setShowActiveOnly}
                      id="filter-active"
                    />
                    <Label htmlFor="filter-active" className="text-sm cursor-pointer">
                      Show only
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {showActiveOnly 
                    ? "Showing venues with open entertainment requests"
                    : "Toggle to show only venues actively seeking artists"
                  }
                </p>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {city && (
                <Badge variant="secondary" className="gap-1">
                  {city}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setCity('')} />
                </Badge>
              )}
              {selectedVenueTypes.map(type => (
                <Badge key={type} variant="secondary" className="gap-1">
                  {VENUE_TYPE_LABELS[type]}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleVenueType(type)} />
                </Badge>
              ))}
              {selectedGenres.map(genre => (
                <Badge key={genre} variant="secondary" className="gap-1">
                  {GENRE_LABELS[genre]}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleGenre(genre)} />
                </Badge>
              ))}
              {filterByCapacity && (
                <Badge variant="secondary" className="gap-1">
                  {capacityRange[0]} - {capacityRange[1]}{capacityRange[1] >= 2000 ? '+' : ''} guests
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilterByCapacity(false)} />
                </Badge>
              )}
              {filterByRating && minRating > 0 && (
                <Badge variant="secondary" className="gap-1 flex items-center">
                  {minRating}+ <Star className="w-3 h-3 fill-current" />
                  <X className="w-3 h-3 cursor-pointer" onClick={() => { setFilterByRating(false); setMinRating(0); }} />
                </Badge>
              )}
              {showActiveOnly && (
                <Badge variant="secondary" className="gap-1 flex items-center bg-artist/20 text-artist border-0">
                  <Megaphone className="w-3 h-3" />
                  Seeking Artists
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setShowActiveOnly(false)} />
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
              {venues.length === 0 
                ? 'No venues found matching your criteria'
                : `${venues.length} ${venues.length === 1 ? 'venue' : 'venues'} found`
              }
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => {
            const venueRequests = entertainmentRequests.get(venue.id) || [];
            const hasActiveRequests = venueRequests.length > 0;
            
            return (
              <Link key={venue.id} to={`/venue/${venue.id}`}>
                <Card className={cn(
                  "bg-card border-border hover:border-venue/50 transition-all cursor-pointer h-full",
                  hasActiveRequests && "ring-2 ring-artist/30 border-artist/50"
                )}>
                  <CardContent className="p-6">
                    {/* Active Request Banner */}
                    {hasActiveRequests && (
                      <div className="mb-4 -mt-2 -mx-2 px-3 py-2 bg-gradient-to-r from-artist/20 to-artist/10 rounded-lg border border-artist/20">
                        <div className="flex items-center gap-2 text-artist">
                          <Megaphone className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Seeking {venueRequests.length === 1 ? 'an artist' : `${venueRequests.length} artists`}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-artist/80">
                          {venueRequests.slice(0, 2).map((req, idx) => (
                            <span key={req.id}>
                              {idx > 0 && ' • '}
                              {format(new Date(req.requested_date), 'MMM d')}
                              {req.budget_min && req.budget_max && (
                                <span> (${req.budget_min}-${req.budget_max})</span>
                              )}
                            </span>
                          ))}
                          {venueRequests.length > 2 && (
                            <span> +{venueRequests.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {venue.profile_image_url ? (
                        <img 
                          src={venue.profile_image_url} 
                          alt={venue.venue_name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-venue/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-8 h-8 text-venue" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{venue.venue_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {venue.city}
                        </p>
                        <RatingDisplay 
                          rating={(venue as any).average_rating} 
                          totalReviews={(venue as any).total_reviews || 0}
                          size="sm"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Venue Type & Capacity */}
                    <div className="mt-4 flex items-center gap-3">
                      <Badge className="bg-venue/20 text-venue border-0">
                        {VENUE_TYPE_LABELS[venue.venue_type]}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{venue.capacity_min} - {venue.capacity_max}</span>
                      </div>
                    </div>

                    {/* Music Preferences */}
                    {venue.music_preferences && venue.music_preferences.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {venue.music_preferences.slice(0, 3).map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-xs">
                            {GENRE_LABELS[genre]}
                          </Badge>
                        ))}
                        {venue.music_preferences.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{venue.music_preferences.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Booking Nights */}
                    {venue.booking_nights && venue.booking_nights.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm truncate">
                          {venue.booking_nights.slice(0, 3).join(', ')}
                          {venue.booking_nights.length > 3 && ` +${venue.booking_nights.length - 3}`}
                        </span>
                      </div>
                    )}

                    {/* Social Link */}
                    {venue.instagram_url && (
                      <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                        <Instagram className="w-4 h-4" />
                        <span className="text-sm truncate">
                          {venue.instagram_url.replace('https://instagram.com/', '@')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {!hasSearched && (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold mb-2">Discover Venues</h3>
            <p className="text-muted-foreground">
              Search by city to find venues looking for artists like you
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchVenues;
