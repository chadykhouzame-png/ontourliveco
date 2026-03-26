import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformMetrics, PLATFORM_CONFIG, parseNum, parseFloat_ } from './types';

interface PlatformCardProps {
  platform: PlatformMetrics;
  index: number;
  onUpdate: (index: number, field: keyof PlatformMetrics, value: string | number | null) => void;
  onRemove: (index: number) => void;
}

const PlatformCard = ({ platform, index, onUpdate, onRemove }: PlatformCardProps) => {
  const config = PLATFORM_CONFIG[platform.platform];
  const Icon = config.icon;

  return (
    <div className={cn("p-4 rounded-xl border border-border/50 space-y-4", config.bgColor)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", config.color)} />
          <span className="font-semibold text-sm">{config.name}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive h-8 w-8 p-0"
          aria-label={`Remove ${config.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-xs text-muted-foreground">Username</Label>
          <Input
            placeholder="@username"
            value={platform.platform_username}
            onChange={e => onUpdate(index, 'platform_username', e.target.value)}
            className="h-9 text-sm mt-1"
            maxLength={100}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-xs text-muted-foreground">Profile URL</Label>
          <Input
            placeholder="https://..."
            value={platform.profile_url}
            onChange={e => onUpdate(index, 'profile_url', e.target.value)}
            className="h-9 text-sm mt-1"
            maxLength={500}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Followers</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={platform.follower_count ?? ''}
            onChange={e => onUpdate(index, 'follower_count', parseNum(e.target.value))}
            className="h-9 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Total Likes</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={platform.likes_count ?? ''}
            onChange={e => onUpdate(index, 'likes_count', parseNum(e.target.value))}
            className="h-9 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Comments</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={platform.comments_count ?? ''}
            onChange={e => onUpdate(index, 'comments_count', parseNum(e.target.value))}
            className="h-9 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Shares</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={platform.shares_count ?? ''}
            onChange={e => onUpdate(index, 'shares_count', parseNum(e.target.value))}
            className="h-9 text-sm mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Eng. Rate %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            placeholder="0.00"
            value={platform.engagement_rate ?? ''}
            onChange={e => onUpdate(index, 'engagement_rate', parseFloat_(e.target.value))}
            className="h-9 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Avg Likes/Post</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={platform.avg_likes_per_post ?? ''}
            onChange={e => onUpdate(index, 'avg_likes_per_post', parseNum(e.target.value))}
            className="h-9 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Avg Comments/Post</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={platform.avg_comments_per_post ?? ''}
            onChange={e => onUpdate(index, 'avg_comments_per_post', parseNum(e.target.value))}
            className="h-9 text-sm mt-1"
          />
        </div>
      </div>
    </div>
  );
};

export default PlatformCard;
