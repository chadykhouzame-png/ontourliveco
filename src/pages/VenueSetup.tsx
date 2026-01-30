import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Instagram, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Genre, VenueType, GENRE_LABELS, VENUE_TYPE_LABELS } from '@/types/database';

const GENRES: Genre[] = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats',
  'amapiano', 'latin', 'pop', 'rock', 'jazz', 'soul', 'funk',
  'drum_and_bass', 'uk_garage', 'reggae', 'dancehall', 'other'
];

const VENUE_TYPES: VenueType[] = [
  'bar', 'club', 'restaurant', 'hotel', 'rooftop', 'lounge',
  'festival', 'private_event', 'other'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const VenueSetup = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [venueType, setVenueType] = useState<VenueType>('bar');
  const [capacityMin, setCapacityMin] = useState('');
  const [capacityMax, setCapacityMax] = useState('');
  const [description, setDescription] = useState('');
  const [musicPreferences, setMusicPreferences] = useState<Genre[]>([]);
  const [bookingNights, setBookingNights] = useState<string[]>([]);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingVenue, setExistingVenue] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/join/venue');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('venues')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setExistingVenue(true);
        setVenueName(data.venue_name);
        setCity(data.city);
        setVenueType(data.venue_type as VenueType);
        setCapacityMin(data.capacity_min?.toString() || '');
        setCapacityMax(data.capacity_max?.toString() || '');
        setDescription(data.description || '');
        setMusicPreferences((data.music_preferences as Genre[]) || []);
        setBookingNights(data.booking_nights || []);
        setInstagramUrl(data.instagram_url || '');
      }
    };
    
    checkExistingProfile();
  }, [user]);

  const toggleGenre = (genre: Genre) => {
    setMusicPreferences(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const toggleDay = (day: string) => {
    setBookingNights(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!venueName.trim() || !city.trim()) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Please fill in your venue name and city.",
      });
      return;
    }
    
    if (!instagramUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Instagram required",
        description: "Please add your venue's Instagram profile URL.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const venueData = {
        user_id: user.id,
        venue_name: venueName.trim(),
        city: city.trim(),
        venue_type: venueType,
        capacity_min: capacityMin ? parseInt(capacityMin) : null,
        capacity_max: capacityMax ? parseInt(capacityMax) : null,
        description: description.trim() || null,
        music_preferences: musicPreferences,
        booking_nights: bookingNights,
        instagram_url: instagramUrl.trim(),
        is_profile_complete: true,
      };

      if (existingVenue) {
        const { error } = await supabase
          .from('venues')
          .update(venueData)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('venues')
          .insert(venueData);
        
        if (error) throw error;
      }

      toast({
        title: "Profile saved!",
        description: "You're ready to start discovering artists.",
      });
      navigate('/venue/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving profile",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-venue/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-venue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Venue Profile Setup</h1>
            <p className="text-muted-foreground">Help artists find you</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>Tell artists about your venue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name *</Label>
                  <Input
                    id="venueName"
                    placeholder="The Rooftop Bar"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Sydney, Australia"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venueType">Venue Type</Label>
                  <Select value={venueType} onValueChange={(value) => setVenueType(value as VenueType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {VENUE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {VENUE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity Range</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={capacityMin}
                      onChange={(e) => setCapacityMin(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={capacityMax}
                      onChange={(e) => setCapacityMax(e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell artists about your venue, vibe, typical crowd..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Music Preferences</CardTitle>
              <CardDescription>What genres fit your venue?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      musicPreferences.includes(genre)
                        ? 'bg-venue text-venue-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {GENRE_LABELS[genre]}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Booking Nights</CardTitle>
              <CardDescription>When do you typically need artists?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      bookingNights.includes(day)
                        ? 'bg-venue text-venue-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Help artists find you online</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram URL *
                </Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/yourvenue"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full bg-venue hover:bg-venue/90"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save & Go to Dashboard'}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VenueSetup;
