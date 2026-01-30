import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Music, Calendar as CalendarIcon, MapPin, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TravelDate } from '@/types/database';
import CityAutocomplete from '@/components/CityAutocomplete';

const ArtistTravel = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [artistId, setArtistId] = useState<string | null>(null);
  const [travelDates, setTravelDates] = useState<TravelDate[]>([]);
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/join/artist');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Get artist ID
      const { data: artist } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!artist) {
        navigate('/artist/setup');
        return;
      }
      
      setArtistId(artist.id);
      
      // Get travel dates
      const { data: dates } = await supabase
        .from('travel_dates')
        .select('*')
        .eq('artist_id', artist.id)
        .order('start_date', { ascending: true });
      
      setTravelDates(dates || []);
      setIsFetching(false);
    };
    
    fetchData();
  }, [user, navigate]);

  const handleAddTravelDate = async () => {
    if (!artistId || !city.trim() || !startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all fields.",
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        variant: "destructive",
        title: "Invalid dates",
        description: "End date must be after start date.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('travel_dates')
        .insert({
          artist_id: artistId,
          city: city.trim(),
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          is_available: isAvailable,
        })
        .select()
        .single();

      if (error) throw error;

      setTravelDates(prev => [...prev, data as TravelDate].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ));
      
      // Reset form
      setCity('');
      setStartDate(undefined);
      setEndDate(undefined);
      setIsAvailable(true);

      toast({
        title: "Travel date added!",
        description: `You're now visible in ${city.trim()} from ${format(startDate, 'MMM d')} to ${format(endDate, 'MMM d')}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding travel date",
        description: error.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTravelDate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('travel_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTravelDates(prev => prev.filter(td => td.id !== id));
      
      toast({
        title: "Travel date removed",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error removing travel date",
        description: error.message,
      });
    }
  };

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('travel_dates')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setTravelDates(prev => prev.map(td => 
        td.id === id ? { ...td, is_available: !currentStatus } : td
      ));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating availability",
        description: error.message,
      });
    }
  };

  if (authLoading || isFetching) {
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
            <h1 className="text-2xl font-bold">Travel & Availability</h1>
            <p className="text-muted-foreground">Let venues know where you'll be</p>
          </div>
        </div>

        {/* Add new travel date */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Travel Dates
            </CardTitle>
            <CardDescription>Where are you heading next?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <CityAutocomplete
                id="city"
                placeholder="e.g., Melbourne, Australia"
                value={city}
                onChange={setCity}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date < (startDate || new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Available for bookings</Label>
                <p className="text-xs text-muted-foreground">Turn off if dates are tentative</p>
              </div>
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
            </div>

            <Button 
              onClick={handleAddTravelDate}
              className="w-full bg-artist hover:bg-artist/90"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Travel Dates'}
            </Button>
          </CardContent>
        </Card>

        {/* Existing travel dates */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle>Your Upcoming Travel</CardTitle>
            <CardDescription>
              {travelDates.length === 0 
                ? "No travel dates yet. Add some above!"
                : `${travelDates.length} upcoming ${travelDates.length === 1 ? 'trip' : 'trips'}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {travelDates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Add your travel dates to get discovered by venues</p>
              </div>
            ) : (
              <div className="space-y-3">
                {travelDates.map((td) => (
                  <div 
                    key={td.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      td.is_available ? "border-artist/30 bg-artist/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className={cn(
                        "w-5 h-5",
                        td.is_available ? "text-artist" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">{td.city}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(td.start_date), 'MMM d')} – {format(new Date(td.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={td.is_available}
                        onCheckedChange={() => handleToggleAvailability(td.id, td.is_available)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTravelDate(td.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          onClick={() => navigate('/artist/dashboard')}
          className="w-full"
          size="lg"
          variant="outline"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ArtistTravel;
