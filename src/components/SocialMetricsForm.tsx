import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Music, Instagram, Save, Plus, Trash2, Loader2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { z } from 'zod';

type SocialPlatform = 'spotify' | 'instagram' | 'tiktok' | 'soundcloud';

interface PlatformMetrics {
  id?: string;
  platform: SocialPlatform;
  platform_username: string;
  profile_url: string;
  follower_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  engagement_rate: number | null;
  avg_likes_per_post: number | null;
  avg_comments_per_post: number | null;
}

interface SocialMetricsFormProps {
  artistId: string;
  onSaved?: () => void;
}

const PLATFORM_CONFIG: Record<SocialPlatform, {
  name: string;
  icon: typeof Music;
  color: string;
  bgColor: string;
}> = {
  spotify: { name: 'Spotify', icon: Music, color: 'text-[#1DB954]', bgColor: 'bg-[#1DB954]/10' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-[#E4405F]', bgColor: 'bg-[#E4405F]/10' },
  tiktok: { name: 'TikTok', icon: Music, color: 'text-foreground', bgColor: 'bg-foreground/10' },
  soundcloud: { name: 'SoundCloud', icon: Music, color: 'text-[#FF5500]', bgColor: 'bg-[#FF5500]/10' },
};

const ALL_PLATFORMS: SocialPlatform[] = ['spotify', 'instagram', 'tiktok', 'soundcloud'];

const metricsSchema = z.object({
  platform_username: z.string().trim().max(100, 'Username too long'),
  profile_url: z.string().trim().max(500, 'URL too long').refine(
    val => !val || val.startsWith('https://') || val.startsWith('http://'),
    'URL must start with https:// or http://'
  ),
  follower_count: z.number().int().min(0).max(999999999).nullable(),
  likes_count: z.number().int().min(0).max(999999999).nullable(),
  comments_count: z.number().int().min(0).max(999999999).nullable(),
  shares_count: z.number().int().min(0).max(999999999).nullable(),
  engagement_rate: z.number().min(0).max(100).nullable(),
  avg_likes_per_post: z.number().int().min(0).max(999999999).nullable(),
  avg_comments_per_post: z.number().int().min(0).max(999999999).nullable(),
});

const emptyMetrics = (platform: SocialPlatform): PlatformMetrics => ({
  platform,
  platform_username: '',
  profile_url: '',
  follower_count: null,
  likes_count: null,
  comments_count: null,
  shares_count: null,
  engagement_rate: null,
  avg_likes_per_post: null,
  avg_comments_per_post: null,
});

const parseNum = (val: string): number | null => {
  if (!val.trim()) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

const parseFloat_ = (val: string): number | null => {
  if (!val.trim()) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
};

export const SocialMetricsForm = ({ artistId, onSaved }: SocialMetricsFormProps) => {
  const [platforms, setPlatforms] = useState<PlatformMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('social_connections')
        .select('id, platform, platform_username, profile_url, follower_count, likes_count, comments_count, shares_count, engagement_rate, avg_likes_per_post, avg_comments_per_post, is_connected')
        .eq('artist_id', artistId);

      if (data && data.length > 0) {
        setPlatforms(data.map(d => ({
          id: d.id,
          platform: d.platform as SocialPlatform,
          platform_username: d.platform_username || '',
          profile_url: d.profile_url || '',
          follower_count: d.follower_count,
          likes_count: d.likes_count,
          comments_count: d.comments_count,
          shares_count: d.shares_count,
          engagement_rate: d.engagement_rate ? Number(d.engagement_rate) : null,
          avg_likes_per_post: d.avg_likes_per_post,
          avg_comments_per_post: d.avg_comments_per_post,
        })));
      }
      setIsLoading(false);
    };
    fetch();
  }, [artistId]);

  const addPlatform = (platform: SocialPlatform) => {
    setPlatforms(prev => [...prev, emptyMetrics(platform)]);
  };

  const removePlatform = (index: number) => {
    const removed = platforms[index];
    if (!removed) return;

    const confirmed = window.confirm(
      `Remove ${PLATFORM_CONFIG[removed.platform].name} and its metrics?`
    );
    if (!confirmed) return;

    setPlatforms(prev => prev.filter((_, i) => i !== index));

    toast({
      title: `${PLATFORM_CONFIG[removed.platform].name} removed`,
      description: 'Click Undo to restore it.',
      action: (
        <ToastAction
          altText="Undo remove platform"
          onClick={() => {
            setPlatforms(prev => {
              const copy = [...prev];
              copy.splice(index, 0, removed);
              return copy;
            });
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  const updateField = (index: number, field: keyof PlatformMetrics, value: string | number | null) => {
    setPlatforms(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const availablePlatforms = ALL_PLATFORMS.filter(
    p => !platforms.some(existing => existing.platform === p)
  );

  const handleSave = async () => {
    // Validate all platforms
    for (const p of platforms) {
      const result = metricsSchema.safeParse(p);
      if (!result.success) {
        toast({ title: `Invalid data for ${PLATFORM_CONFIG[p.platform].name}`, description: result.error.errors[0].message, variant: 'destructive' });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Fetch current records to determine what to delete
      const { data: existing } = await supabase
        .from('social_connections')
        .select('id, platform')
        .eq('artist_id', artistId);

      const currentPlatformSet = new Set(platforms.map(p => p.platform));
      const removedIds = (existing || [])
        .filter(e => !currentPlatformSet.has(e.platform as SocialPlatform))
        .map(e => e.id);

      // Delete removed platforms
      if (removedIds.length > 0) {
        await supabase.from('social_connections').delete().in('id', removedIds);
      }

      // Upsert existing and new platforms
      for (const p of platforms) {
        const row = {
          artist_id: artistId,
          platform: p.platform,
          platform_username: p.platform_username || null,
          profile_url: p.profile_url || null,
          follower_count: p.follower_count,
          likes_count: p.likes_count,
          comments_count: p.comments_count,
          shares_count: p.shares_count,
          engagement_rate: p.engagement_rate,
          avg_likes_per_post: p.avg_likes_per_post,
          avg_comments_per_post: p.avg_comments_per_post,
          is_connected: true,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        };

        if (p.id) {
          // Update existing record by id
          const { error } = await supabase
            .from('social_connections')
            .update(row)
            .eq('id', p.id);
          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from('social_connections')
            .insert(row);
          if (error) throw error;
        }
      }

      toast({ title: 'Social metrics saved!' });
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass border-border/50 rounded-2xl">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="glass border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Social Media Metrics
        </CardTitle>
        <CardDescription>Manually enter your follower counts and engagement stats</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {platforms.map((platform, index) => {
          const config = PLATFORM_CONFIG[platform.platform];
          const Icon = config.icon;

          return (
            <div key={`${platform.platform}-${index}`} className={cn("p-4 rounded-xl border border-border/50 space-y-4", config.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-5 h-5", config.color)} />
                  <span className="font-semibold text-sm">{config.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePlatform(index)}
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
                    onChange={e => updateField(index, 'platform_username', e.target.value)}
                    className="h-9 text-sm mt-1"
                    maxLength={100}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">Profile URL</Label>
                  <Input
                    placeholder="https://..."
                    value={platform.profile_url}
                    onChange={e => updateField(index, 'profile_url', e.target.value)}
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
                    onChange={e => updateField(index, 'follower_count', parseNum(e.target.value))}
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
                    onChange={e => updateField(index, 'likes_count', parseNum(e.target.value))}
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
                    onChange={e => updateField(index, 'comments_count', parseNum(e.target.value))}
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
                    onChange={e => updateField(index, 'shares_count', parseNum(e.target.value))}
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
                    onChange={e => updateField(index, 'engagement_rate', parseFloat_(e.target.value))}
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
                    onChange={e => updateField(index, 'avg_likes_per_post', parseNum(e.target.value))}
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
                    onChange={e => updateField(index, 'avg_comments_per_post', parseNum(e.target.value))}
                    className="h-9 text-sm mt-1"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Add platform buttons */}
        {availablePlatforms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availablePlatforms.map(platform => {
              const config = PLATFORM_CONFIG[platform];
              const Icon = config.icon;
              return (
                <Button
                  key={platform}
                  variant="outline"
                  size="sm"
                  onClick={() => addPlatform(platform)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <Icon className={cn("w-3.5 h-3.5", config.color)} />
                  {config.name}
                </Button>
              );
            })}
          </div>
        )}

        {/* Save button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Social Metrics
        </Button>
      </CardContent>
    </Card>

    </>
  );
};


export default SocialMetricsForm;
