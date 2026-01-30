import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Music, Instagram, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Genre, GENRE_LABELS } from '@/types/database';

const GENRES: Genre[] = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats',
  'amapiano', 'latin', 'pop', 'rock', 'jazz', 'soul', 'funk',
  'drum_and_bass', 'uk_garage', 'reggae', 'dancehall', 'other'
];

const ArtistSetup = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [artistName, setArtistName] = useState('');
  const [primaryCity, setPrimaryCity] = useState('');
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingArtist, setExistingArtist] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/join/artist');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setExistingArtist(true);
        setArtistName(data.artist_name);
        setPrimaryCity(data.primary_city);
        setBio(data.bio || '');
        setSelectedGenres((data.genres as Genre[]) || []);
        setInstagramUrl(data.instagram_url || '');
        setSoundcloudUrl(data.soundcloud_url || '');
        setSpotifyUrl(data.spotify_url || '');
      }
    };
    
    checkExistingProfile();
  }, [user]);

  const toggleGenre = (genre: Genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!artistName.trim() || !primaryCity.trim()) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Please fill in your artist name and primary city.",
      });
      return;
    }
    
    if (!instagramUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Instagram required",
        description: "Please add your Instagram profile URL.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const artistData = {
        user_id: user.id,
        artist_name: artistName.trim(),
        primary_city: primaryCity.trim(),
        bio: bio.trim() || null,
        genres: selectedGenres,
        instagram_url: instagramUrl.trim(),
        soundcloud_url: soundcloudUrl.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        is_profile_complete: true,
      };

      if (existingArtist) {
        const { error } = await supabase
          .from('artists')
          .update(artistData)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('artists')
          .insert(artistData);
        
        if (error) throw error;
      }

      toast({
        title: "Profile saved!",
        description: "Now let's add your travel dates.",
      });
      navigate('/artist/travel');
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
          <div className="w-12 h-12 bg-artist/20 rounded-xl flex items-center justify-center">
            <Music className="w-6 h-6 text-artist" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Artist Profile Setup</h1>
            <p className="text-muted-foreground">Make yourself look legit</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>How venues will find you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="artistName">Artist / Stage Name *</Label>
                  <Input
                    id="artistName"
                    placeholder="DJ Fresh"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryCity">Primary City *</Label>
                  <Input
                    id="primaryCity"
                    placeholder="Sydney, Australia"
                    value={primaryCity}
                    onChange={(e) => setPrimaryCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell venues about yourself, your style, and what you bring to the decks..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Genres</CardTitle>
              <CardDescription>Select all that apply</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>How venues can check you out</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram URL *
                </Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/yourprofile"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="soundcloud">SoundCloud URL (optional)</Label>
                <Input
                  id="soundcloud"
                  placeholder="https://soundcloud.com/yourprofile"
                  value={soundcloudUrl}
                  onChange={(e) => setSoundcloudUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spotify">Spotify URL (optional)</Label>
                <Input
                  id="spotify"
                  placeholder="https://open.spotify.com/artist/..."
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full bg-artist hover:bg-artist/90"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save & Add Travel Dates'}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ArtistSetup;
