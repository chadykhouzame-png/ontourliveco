import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Music, ArrowRight, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Genre, GENRE_LABELS } from '@/types/database';
import CityAutocomplete from '@/components/CityAutocomplete';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import ReviewStatusBadge from '@/components/ReviewStatusBadge';
import SocialConnectButton, { SocialPlatform } from '@/components/SocialConnectButton';
import AiBioGenerator from '@/components/AiBioGenerator';

type SocialConnection = {
  platform: SocialPlatform;
  platform_username?: string | null;
  follower_count?: number | null;
  is_connected: boolean;
  profile_url?: string | null;
};

const GENRES: Genre[] = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats',
  'amapiano', 'latin', 'pop', 'rock', 'jazz', 'soul', 'funk',
  'drum_and_bass', 'uk_garage', 'reggae', 'dancehall', 'other'
];

const ArtistSetup = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { showErrorWithTitle } = useErrorHandler();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [primaryCity, setPrimaryCity] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState('pending');
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [feeRangeMin, setFeeRangeMin] = useState<string>('');
  const [feeRangeMax, setFeeRangeMax] = useState<string>('');
  const [showFeeRange, setShowFeeRange] = useState(false);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingArtist, setExistingArtist] = useState(false);

  // Fetch social connections - use base table for owner (needs to see all connections, not just connected)
  const fetchSocialConnections = async (artistIdParam: string) => {
    const { data } = await supabase
      .from('social_connections')
      .select('id, artist_id, platform, platform_username, profile_url, follower_count, is_connected, connected_at, last_synced_at, created_at, updated_at')
      .eq('artist_id', artistIdParam);
    
    if (data) {
      setSocialConnections(data.map(conn => ({
        platform: conn.platform as SocialPlatform,
        platform_username: conn.platform_username,
        follower_count: conn.follower_count,
        is_connected: conn.is_connected,
        profile_url: conn.profile_url,
      })));
    }
  };

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
        setArtistId(data.id);
        setFirstName((data as any).first_name || '');
        setLastName((data as any).last_name || '');
        setArtistName(data.artist_name);
        setPrimaryCity(data.primary_city);
        setProfileImageUrl(data.profile_image_url);
        setReviewStatus((data as any).review_status || 'pending');
        setBio(data.bio || '');
        setSelectedGenres((data.genres as Genre[]) || []);
        setFeeRangeMin(data.fee_range_min?.toString() || '');
        setFeeRangeMax(data.fee_range_max?.toString() || '');
        setShowFeeRange(data.show_fee_range || false);
        
        // Fetch social connections
        fetchSocialConnections(data.id);
      }
    };
    
    checkExistingProfile();
  }, [user]);

  const handleSocialConnect = async (platform: SocialPlatform) => {
    // For now, show a toast that this feature is coming soon
    toast({
      title: "Coming Soon",
      description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth integration is being set up. You'll be able to connect your account soon!`,
    });
  };

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
    if (!firstName.trim() || !lastName.trim() || !artistName.trim() || !primaryCity.trim()) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Please fill in your name, artist name, and primary city.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const artistData = {
        user_id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        artist_name: artistName.trim(),
        primary_city: primaryCity.trim(),
        profile_image_url: profileImageUrl,
        bio: bio.trim() || null,
        genres: selectedGenres,
        fee_range_min: feeRangeMin ? parseInt(feeRangeMin) : null,
        fee_range_max: feeRangeMax ? parseInt(feeRangeMax) : null,
        show_fee_range: showFeeRange,
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
    } catch (error: unknown) {
      showErrorWithTitle(error, "Error saving profile", 'artist-setup');
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Basic Info</CardTitle>
                  <CardDescription>How venues will find you</CardDescription>
                </div>
                <ReviewStatusBadge status={reviewStatus} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <ProfileImageUpload
                  currentImageUrl={profileImageUrl}
                  onImageUploaded={setProfileImageUrl}
                  variant="artist"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

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
                  <CityAutocomplete
                    id="primaryCity"
                    placeholder="Sydney, Australia"
                    value={primaryCity}
                    onChange={setPrimaryCity}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">Bio</Label>
                  <AiBioGenerator
                    artistName={artistName}
                    city={primaryCity}
                    genres={selectedGenres}
                    onBioGenerated={setBio}
                  />
                </div>
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
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-artist" />
                Your Rates
              </CardTitle>
              <CardDescription>
                Set your fee range so venues know what to expect. You can choose to show this publicly or keep it private.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="feeMin">Minimum Fee ($)</Label>
                  <Input
                    id="feeMin"
                    type="number"
                    placeholder="500"
                    value={feeRangeMin}
                    onChange={(e) => setFeeRangeMin(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeMax">Maximum Fee ($)</Label>
                  <Input
                    id="feeMax"
                    type="number"
                    placeholder="2000"
                    value={feeRangeMax}
                    onChange={(e) => setFeeRangeMax(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50">
                <div>
                  <p className="font-medium">Show rates publicly</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, venues can see your fee range on your profile
                  </p>
                </div>
                <Switch
                  checked={showFeeRange}
                  onCheckedChange={setShowFeeRange}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Connect Your Socials</CardTitle>
              <CardDescription>
                Connect your accounts to show venues your follower counts and verify your presence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SocialConnectButton
                platform="spotify"
                connection={socialConnections.find(c => c.platform === 'spotify')}
                onConnect={handleSocialConnect}
              />
              <SocialConnectButton
                platform="instagram"
                connection={socialConnections.find(c => c.platform === 'instagram')}
                onConnect={handleSocialConnect}
              />
              <SocialConnectButton
                platform="tiktok"
                connection={socialConnections.find(c => c.platform === 'tiktok')}
                onConnect={handleSocialConnect}
              />
              <SocialConnectButton
                platform="soundcloud"
                connection={socialConnections.find(c => c.platform === 'soundcloud')}
                onConnect={handleSocialConnect}
              />
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
