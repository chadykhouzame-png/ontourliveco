import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Music, Building2, AlertTriangle } from 'lucide-react';

const AdminStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [artistsResult, venuesResult, pendingArtistsResult, pendingVenuesResult, disputesResult] = await Promise.all([
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        supabase.from('venues').select('id', { count: 'exact', head: true }),
        supabase.from('artists').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
        supabase.from('venues').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
        supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      return {
        totalArtists: artistsResult.count || 0,
        totalVenues: venuesResult.count || 0,
        pendingArtists: pendingArtistsResult.count || 0,
        pendingVenues: pendingVenuesResult.count || 0,
        openDisputes: disputesResult.count || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Artists',
      value: stats?.totalArtists || 0,
      icon: Music,
      description: `${stats?.pendingArtists || 0} pending approval`,
    },
    {
      title: 'Total Venues',
      value: stats?.totalVenues || 0,
      icon: Building2,
      description: `${stats?.pendingVenues || 0} pending approval`,
    },
    {
      title: 'Pending Approvals',
      value: (stats?.pendingArtists || 0) + (stats?.pendingVenues || 0),
      icon: Users,
      description: 'Profiles awaiting review',
    },
    {
      title: 'Open Disputes',
      value: stats?.openDisputes || 0,
      icon: AlertTriangle,
      description: 'Requires attention',
      urgent: (stats?.openDisputes || 0) > 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className={stat.urgent ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.urgent ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;