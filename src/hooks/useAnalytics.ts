import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, subDays, format } from 'date-fns';

interface ProfileViewStats {
  date: string;
  views: number;
}

interface BookingStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  completed: number;
  cancelled: number;
}

interface AnalyticsData {
  profileViews: ProfileViewStats[];
  totalViews: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  bookingStats: BookingStats;
  recentBookings: Array<{
    id: string;
    status: string;
    requested_date: string;
    other_party_name: string;
    offer_amount: number | null;
  }>;
}

export const useAnalytics = () => {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Get user's profile ID
  useEffect(() => {
    const fetchProfileId = async () => {
      if (!user || !userRole) return;

      if (userRole === 'artist') {
        const { data: artist } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', user.id)
          .single();
        setProfileId(artist?.id || null);
      } else if (userRole === 'venue') {
        const { data: venue } = await supabase
          .from('venues')
          .select('id')
          .eq('user_id', user.id)
          .single();
        setProfileId(venue?.id || null);
      }
    };

    fetchProfileId();
  }, [user, userRole]);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !userRole || !profileId) return;

    setLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sevenDaysAgo = subDays(now, 7);

      // Fetch profile views
      const { data: viewsData, error: viewsError } = await supabase
        .from('profile_views')
        .select('viewed_at')
        .eq('profile_type', userRole)
        .eq('profile_id', profileId)
        .gte('viewed_at', thirtyDaysAgo.toISOString());

      if (viewsError) throw viewsError;

      // Group views by date
      const viewsByDate = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(now, i), 'MMM d');
        viewsByDate.set(date, 0);
      }

      (viewsData || []).forEach((view) => {
        const date = format(new Date(view.viewed_at), 'MMM d');
        viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1);
      });

      const profileViews: ProfileViewStats[] = Array.from(viewsByDate.entries()).map(
        ([date, views]) => ({ date, views })
      );

      const totalViews = viewsData?.length || 0;
      const viewsThisWeek = viewsData?.filter(
        (v) => new Date(v.viewed_at) >= startOfDay(sevenDaysAgo)
      ).length || 0;
      const viewsThisMonth = totalViews;

      // Fetch booking stats
      const bookingColumn = userRole === 'artist' ? 'artist_id' : 'venue_id';
      const otherColumn = userRole === 'artist' ? 'venue_id' : 'artist_id';
      const otherTable = userRole === 'artist' ? 'venues' : 'artists';
      const otherNameField = userRole === 'artist' ? 'venue_name' : 'artist_name';

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('booking_requests')
        .select(`
          id,
          status,
          requested_date,
          offer_amount,
          ${otherColumn}
        `)
        .eq(bookingColumn, profileId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const bookingStats: BookingStats = {
        total: bookingsData?.length || 0,
        pending: bookingsData?.filter((b) => b.status === 'pending').length || 0,
        accepted: bookingsData?.filter((b) => b.status === 'accepted').length || 0,
        declined: bookingsData?.filter((b) => b.status === 'declined').length || 0,
        completed: bookingsData?.filter((b) => b.status === 'completed').length || 0,
        cancelled: bookingsData?.filter((b) => b.status === 'cancelled').length || 0,
      };

      // Fetch other party names for recent bookings
      const recentBookings = await Promise.all(
        (bookingsData || []).slice(0, 5).map(async (booking) => {
          const otherId = userRole === 'artist' 
            ? (booking as { venue_id: string }).venue_id 
            : (booking as { artist_id: string }).artist_id;
          
          let otherName = 'Unknown';
          
          if (userRole === 'artist') {
            const { data: venueData } = await supabase
              .from('venues')
              .select('venue_name')
              .eq('id', otherId)
              .single();
            otherName = venueData?.venue_name || 'Unknown';
          } else {
            const { data: artistData } = await supabase
              .from('artists')
              .select('artist_name')
              .eq('id', otherId)
              .single();
            otherName = artistData?.artist_name || 'Unknown';
          }

          return {
            id: booking.id,
            status: booking.status || 'pending',
            requested_date: booking.requested_date,
            other_party_name: otherName,
            offer_amount: booking.offer_amount,
          };
        })
      );

      setData({
        profileViews,
        totalViews,
        viewsThisWeek,
        viewsThisMonth,
        bookingStats,
        recentBookings,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user, userRole, profileId]);

  useEffect(() => {
    if (profileId) {
      fetchAnalytics();
    }
  }, [profileId, fetchAnalytics]);

  return {
    data,
    loading,
    error,
    profileId,
    userRole,
    refetch: fetchAnalytics,
  };
};

// Hook to record a profile view
export const useRecordProfileView = () => {
  const { user, userRole } = useAuth();

  const recordView = async (profileType: 'artist' | 'venue', profileId: string) => {
    // Don't record views of own profile
    if (!profileId) return;

    let viewerId: string | null = null;
    let viewerType: 'artist' | 'venue' | 'anonymous' = 'anonymous';

    if (user && userRole) {
      viewerId = user.id;
      viewerType = userRole as 'artist' | 'venue';
    }

    try {
      await supabase.from('profile_views').insert({
        profile_type: profileType,
        profile_id: profileId,
        viewer_id: viewerId,
        viewer_type: viewerType,
      });
    } catch (err) {
      console.error('Failed to record profile view:', err);
    }
  };

  return { recordView };
};
