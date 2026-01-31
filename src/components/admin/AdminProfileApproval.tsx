import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle, ExternalLink, Music, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { GENRE_LABELS, VENUE_TYPE_LABELS } from '@/types/database';
import type { Database } from '@/integrations/supabase/types';

type Artist = Database['public']['Tables']['artists']['Row'];
type Venue = Database['public']['Tables']['venues']['Row'];

const AdminProfileApproval = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('artists');

  const { data: pendingArtists, isLoading: loadingArtists } = useQuery({
    queryKey: ['pending-artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Artist[];
    },
  });

  const { data: pendingVenues, isLoading: loadingVenues } = useQuery({
    queryKey: ['pending-venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Venue[];
    },
  });

  const updateArtistStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('artists')
        .update({ review_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-artists'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Artist status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const updateVenueStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('venues')
        .update({ review_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Venue status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const renderArtistCard = (artist: Artist) => (
    <Card key={artist.id} className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={artist.profile_image_url || undefined} />
            <AvatarFallback><Music className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{artist.artist_name}</h3>
              <Badge variant="outline" className="shrink-0">Pending</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{artist.primary_city}</p>
            {artist.genres && artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {artist.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {GENRE_LABELS[genre] || genre}
                  </Badge>
                ))}
                {artist.genres.length > 3 && (
                  <Badge variant="secondary" className="text-xs">+{artist.genres.length - 3}</Badge>
                )}
              </div>
            )}
            {artist.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{artist.bio}</p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => updateArtistStatus.mutate({ id: artist.id, status: 'approved' })}
                disabled={updateArtistStatus.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => updateArtistStatus.mutate({ id: artist.id, status: 'rejected' })}
                disabled={updateArtistStatus.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a href={`/artist/${artist.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderVenueCard = (venue: Venue) => (
    <Card key={venue.id} className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={venue.profile_image_url || undefined} />
            <AvatarFallback><Building2 className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{venue.venue_name}</h3>
              <Badge variant="outline" className="shrink-0">Pending</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{venue.city}</p>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">{VENUE_TYPE_LABELS[venue.venue_type]}</Badge>
              <span className="text-sm text-muted-foreground">
                {venue.capacity_min}-{venue.capacity_max} capacity
              </span>
            </div>
            {venue.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{venue.description}</p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => updateVenueStatus.mutate({ id: venue.id, status: 'approved' })}
                disabled={updateVenueStatus.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => updateVenueStatus.mutate({ id: venue.id, status: 'rejected' })}
                disabled={updateVenueStatus.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a href={`/venue/${venue.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Approvals</CardTitle>
        <CardDescription>Review and approve new artist and venue profiles</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="artists" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Artists
              {pendingArtists && pendingArtists.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingArtists.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="venues" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Venues
              {pendingVenues && pendingVenues.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingVenues.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artists" className="mt-4">
            {loadingArtists ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-muted rounded w-1/3" />
                          <div className="h-4 bg-muted rounded w-1/4" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingArtists && pendingArtists.length > 0 ? (
              <div className="space-y-4">
                {pendingArtists.map(renderArtistCard)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending artist profiles to review</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="venues" className="mt-4">
            {loadingVenues ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-muted rounded w-1/3" />
                          <div className="h-4 bg-muted rounded w-1/4" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingVenues && pendingVenues.length > 0 ? (
              <div className="space-y-4">
                {pendingVenues.map(renderVenueCard)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending venue profiles to review</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminProfileApproval;