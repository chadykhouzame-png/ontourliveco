import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Music, Instagram, TrendingUp, Users, ExternalLink, Link2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialConnection {
  id: string;
  platform: 'spotify' | 'instagram' | 'tiktok' | 'soundcloud';
  platform_username: string | null;
  follower_count: number | null;
  is_connected: boolean;
  profile_url: string | null;
  last_synced_at: string | null;
}

interface SocialMediaDashboardProps {
  artistId: string;
  className?: string;
}

const PLATFORM_CONFIG: Record<string, {
  name: string;
  icon: typeof Music;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  spotify: {
    name: 'Spotify',
    icon: Music,
    color: 'text-[#1DB954]',
    bgColor: 'bg-[#1DB954]/10',
    gradientFrom: 'from-[#1DB954]',
    gradientTo: 'to-[#1ed760]',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-[#E4405F]',
    bgColor: 'bg-[#E4405F]/10',
    gradientFrom: 'from-[#E4405F]',
    gradientTo: 'to-[#F77737]',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'text-foreground',
    bgColor: 'bg-foreground/10',
    gradientFrom: 'from-foreground/80',
    gradientTo: 'to-foreground',
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: Music,
    color: 'text-[#FF5500]',
    bgColor: 'bg-[#FF5500]/10',
    gradientFrom: 'from-[#FF5500]',
    gradientTo: 'to-[#FF7700]',
  },
};

const formatFollowerCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatFullCount = (count: number): string => {
  return count.toLocaleString();
};

export const SocialMediaDashboard = ({ artistId, className }: SocialMediaDashboardProps) => {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConnections = async () => {
      const { data, error } = await supabase
        .from('social_connections')
        .select('id, platform, platform_username, follower_count, is_connected, profile_url, last_synced_at')
        .eq('artist_id', artistId);

      if (!error && data) {
        setConnections(data as SocialConnection[]);
      }
      setIsLoading(false);
    };

    fetchConnections();
  }, [artistId]);

  const connectedPlatforms = connections.filter(c => c.is_connected);
  const totalFollowers = connectedPlatforms.reduce((sum, c) => sum + (c.follower_count || 0), 0);
  const platformsWithFollowers = connectedPlatforms.filter(c => c.follower_count && c.follower_count > 0);

  if (isLoading) {
    return (
      <Card className={cn("glass border-border/50 rounded-2xl overflow-hidden", className)}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass border-border/50 rounded-2xl overflow-hidden", className)}>
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Social Media
          </div>
          {connectedPlatforms.length > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">
              {connectedPlatforms.length} connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {connectedPlatforms.length === 0 ? (
          <div className="text-center py-6">
            <Link2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-1">No social accounts connected</p>
            <p className="text-sm text-muted-foreground">
              Connect your accounts in Edit Profile to show your reach
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Total Reach Summary */}
            {totalFollowers > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-muted-foreground">Total Reach</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {formatFollowerCount(totalFollowers)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  across {platformsWithFollowers.length} {platformsWithFollowers.length === 1 ? 'platform' : 'platforms'}
                </p>
              </div>
            )}

            {/* Platform Breakdown */}
            <div className="space-y-3">
              {connectedPlatforms.map((connection) => {
                const config = PLATFORM_CONFIG[connection.platform];
                if (!config) return null;
                const Icon = config.icon;
                const percentage = totalFollowers > 0 && connection.follower_count 
                  ? Math.round((connection.follower_count / totalFollowers) * 100) 
                  : 0;

                return (
                  <div
                    key={connection.id}
                    className={cn(
                      "group p-4 rounded-xl border border-border/50 transition-all hover:border-border",
                      config.bgColor
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center",
                          config.bgColor
                        )}>
                          <Icon className={cn("w-4 h-4", config.color)} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{config.name}</p>
                          {connection.platform_username && (
                            <p className="text-xs text-muted-foreground">@{connection.platform_username}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connection.follower_count !== null && connection.follower_count !== undefined && (
                          <div className="text-right">
                            <p className="font-bold text-lg leading-none">
                              {formatFollowerCount(connection.follower_count)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">followers</p>
                          </div>
                        )}
                        {connection.profile_url && (
                          <a
                            href={connection.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Share of total bar */}
                    {totalFollowers > 0 && connection.follower_count && connection.follower_count > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Share of reach</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-background/50 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r", config.gradientFrom, config.gradientTo)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Platform Distribution Chart */}
            {platformsWithFollowers.length > 1 && (
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/30">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                  Audience Distribution
                </p>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                  {platformsWithFollowers.map((connection) => {
                    const config = PLATFORM_CONFIG[connection.platform];
                    if (!config) return null;
                    const percentage = totalFollowers > 0 && connection.follower_count
                      ? (connection.follower_count / totalFollowers) * 100
                      : 0;

                    return (
                      <div
                        key={connection.id}
                        className={cn("bg-gradient-to-r h-full transition-all", config.gradientFrom, config.gradientTo)}
                        style={{ width: `${percentage}%` }}
                        title={`${config.name}: ${formatFullCount(connection.follower_count || 0)} (${Math.round(percentage)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {platformsWithFollowers.map((connection) => {
                    const config = PLATFORM_CONFIG[connection.platform];
                    if (!config) return null;

                    return (
                      <div key={connection.id} className="flex items-center gap-1.5">
                        <div className={cn("w-2.5 h-2.5 rounded-full bg-gradient-to-r", config.gradientFrom, config.gradientTo)} />
                        <span className="text-[11px] text-muted-foreground">
                          {config.name} ({formatFollowerCount(connection.follower_count || 0)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Last synced info */}
            {connectedPlatforms.some(c => c.last_synced_at) && (
              <p className="text-[10px] text-muted-foreground text-center">
                Data from connected accounts • Coming soon: auto-sync & engagement metrics
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialMediaDashboard;
