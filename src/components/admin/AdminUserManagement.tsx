import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Music, Building2, ExternalLink, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Artist = Database['public']['Tables']['artists']['Row'];
type Venue = Database['public']['Tables']['venues']['Row'];

const AdminUserManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userType, setUserType] = useState<'artists' | 'venues'>('artists');

  const { data: artists, isLoading: loadingArtists } = useQuery({
    queryKey: ['all-artists', statusFilter],
    queryFn: async () => {
      let query = supabase.from('artists').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('review_status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Artist[];
    },
    enabled: userType === 'artists',
  });

  const { data: venues, isLoading: loadingVenues } = useQuery({
    queryKey: ['all-venues', statusFilter],
    queryFn: async () => {
      let query = supabase.from('venues').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('review_status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Venue[];
    },
    enabled: userType === 'venues',
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, type }: { id: string; status: string; type: 'artist' | 'venue' }) => {
      const table = type === 'artist' ? 'artists' : 'venues';
      const { error } = await supabase.from(table).update({ review_status: status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-artists'] });
      queryClient.invalidateQueries({ queryKey: ['all-venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const filteredArtists = artists?.filter((artist) =>
    artist.artist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    artist.primary_city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVenues = venues?.filter((venue) =>
    venue.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const isLoading = userType === 'artists' ? loadingArtists : loadingVenues;
  const data = userType === 'artists' ? filteredArtists : filteredVenues;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View and manage all registered artists and venues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={userType} onValueChange={(v) => setUserType(v as 'artists' | 'venues')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="artists">
                <span className="flex items-center gap-2">
                  <Music className="h-4 w-4" /> Artists
                </span>
              </SelectItem>
              <SelectItem value="venues">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Venues
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.length > 0 ? (
                  data.map((item) => {
                    const isArtist = 'artist_name' in item;
                    const name = isArtist ? (item as Artist).artist_name : (item as Venue).venue_name;
                    const location = isArtist ? (item as Artist).primary_city : (item as Venue).city;
                    const imageUrl = item.profile_image_url;
                    const status = item.review_status;
                    const profileUrl = isArtist ? `/artist/${item.id}` : `/venue/${item.id}`;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={imageUrl || undefined} />
                              <AvatarFallback>
                                {isArtist ? <Music className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{name}</p>
                              <p className="text-sm text-muted-foreground">
                                {isArtist ? 'Artist' : 'Venue'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{location}</TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>{format(new Date(item.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={status}
                              onValueChange={(newStatus) =>
                                updateStatus.mutate({
                                  id: item.id,
                                  status: newStatus,
                                  type: isArtist ? 'artist' : 'venue',
                                })
                              }
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" asChild>
                              <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No {userType} found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUserManagement;