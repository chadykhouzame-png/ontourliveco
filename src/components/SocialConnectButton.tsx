import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Instagram, Link2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SocialPlatform = 'spotify' | 'instagram' | 'tiktok' | 'soundcloud';

interface SocialConnection {
  platform: SocialPlatform;
  platform_username?: string | null;
  follower_count?: number | null;
  is_connected: boolean;
  profile_url?: string | null;
}

interface SocialConnectButtonProps {
  platform: SocialPlatform;
  connection?: SocialConnection | null;
  onConnect: (platform: SocialPlatform) => void;
  onDisconnect?: (platform: SocialPlatform) => void;
  disabled?: boolean;
  className?: string;
}

const PLATFORM_CONFIG: Record<SocialPlatform, {
  name: string;
  icon: typeof Music;
  color: string;
  bgColor: string;
  hoverColor: string;
}> = {
  spotify: {
    name: 'Spotify',
    icon: Music,
    color: 'text-[#1DB954]',
    bgColor: 'bg-[#1DB954]/10',
    hoverColor: 'hover:bg-[#1DB954]/20',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-[#E4405F]',
    bgColor: 'bg-[#E4405F]/10',
    hoverColor: 'hover:bg-[#E4405F]/20',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'text-foreground',
    bgColor: 'bg-foreground/10',
    hoverColor: 'hover:bg-foreground/20',
  },
  soundcloud: {
    name: 'SoundCloud',
    icon: Music,
    color: 'text-[#FF5500]',
    bgColor: 'bg-[#FF5500]/10',
    hoverColor: 'hover:bg-[#FF5500]/20',
  },
};

const formatFollowerCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const SocialConnectButton = ({
  platform,
  connection,
  onConnect,
  onDisconnect,
  disabled = false,
  className,
}: SocialConnectButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;
  const isConnected = connection?.is_connected;

  const handleClick = async () => {
    if (disabled) return;
    
    setIsLoading(true);
    try {
      if (isConnected && onDisconnect) {
        await onDisconnect(platform);
      } else {
        await onConnect(platform);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected && connection) {
    return (
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border border-border",
        config.bgColor,
        className
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            config.bgColor
          )}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{config.name}</span>
              <Check className="w-4 h-4 text-green-500" />
            </div>
            {connection.platform_username && (
              <p className="text-sm text-muted-foreground">
                @{connection.platform_username}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connection.follower_count !== null && connection.follower_count !== undefined && (
            <Badge variant="secondary" className="font-semibold">
              {formatFollowerCount(connection.follower_count)} followers
            </Badge>
          )}
          {onDisconnect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClick}
              disabled={isLoading}
              className="text-muted-foreground hover:text-destructive"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "w-full justify-start gap-3 h-14 px-4",
        config.hoverColor,
        className
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        config.bgColor
      )}>
        {isLoading ? (
          <Loader2 className={cn("w-5 h-5 animate-spin", config.color)} />
        ) : (
          <Icon className={cn("w-5 h-5", config.color)} />
        )}
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium">Connect {config.name}</p>
        <p className="text-xs text-muted-foreground">Coming soon</p>
      </div>
      <Link2 className="w-4 h-4 text-muted-foreground" />
    </Button>
  );
};

// Display component for showing social stats on artist profiles (for venues)
interface SocialStatsDisplayProps {
  connections: SocialConnection[];
  className?: string;
}

export const SocialStatsDisplay = ({ connections, className }: SocialStatsDisplayProps) => {
  const connectedPlatforms = connections.filter(c => c.is_connected);
  
  if (connectedPlatforms.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {connectedPlatforms.map((connection) => {
        const config = PLATFORM_CONFIG[connection.platform];
        const Icon = config.icon;
        
        return (
          <div
            key={connection.platform}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              config.bgColor
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("w-5 h-5", config.color)} />
              <div>
                <span className="font-medium">{config.name}</span>
                {connection.platform_username && (
                  <span className="text-sm text-muted-foreground ml-2">
                    @{connection.platform_username}
                  </span>
                )}
              </div>
            </div>
            {connection.follower_count !== null && connection.follower_count !== undefined && (
              <Badge variant="secondary" className="font-semibold">
                {formatFollowerCount(connection.follower_count)}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SocialConnectButton;
