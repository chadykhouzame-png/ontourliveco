import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  SocialPlatform,
  PlatformMetrics,
  ALL_PLATFORMS,
  PLATFORM_CONFIG,
  metricsSchema,
  emptyMetrics,
} from './social-metrics/types';
import PlatformCard from './social-metrics/PlatformCard';
import AddPlatformButtons from './social-metrics/AddPlatformButtons';
import RemovePlatformDialog from './social-metrics/RemovePlatformDialog';

interface SocialMetricsFormProps {
  artistId: string;
  onSaved?: () => void;
}

export const SocialMetricsForm = ({ artistId, onSaved }: SocialMetricsFormProps) => {
  const [platforms, setPlatforms] = useState<PlatformMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [removeDialogIndex, setRemoveDialogIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, [artistId]);

  const addPlatform = (platform: SocialPlatform) => {
    setPlatforms(prev => [...prev, emptyMetrics(platform)]);
  };

  const updateField = (index: number, field: keyof PlatformMetrics, value: string | number | null) => {
    setPlatforms(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const confirmRemovePlatform = () => {
    if (removeDialogIndex === null) return;
    setPlatforms(prev => prev.filter((_, i) => i !== removeDialogIndex));
    setRemoveDialogIndex(null);
  };

  const availablePlatforms = ALL_PLATFORMS.filter(
    p => !platforms.some(existing => existing.platform === p)
  );

  const handleSave = async () => {
    for (const p of platforms) {
      const result = metricsSchema.safeParse(p);
      if (!result.success) {
        toast({ title: `Invalid data for ${PLATFORM_CONFIG[p.platform].name}`, description: result.error.errors[0].message, variant: 'destructive' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from('social_connections')
        .select('id, platform')
        .eq('artist_id', artistId);

      const currentPlatformSet = new Set(platforms.map(p => p.platform));
      const removedIds = (existing || [])
        .filter(e => !currentPlatformSet.has(e.platform as SocialPlatform))
        .map(e => e.id);

      if (removedIds.length > 0) {
        await supabase.from('social_connections').delete().in('id', removedIds);
      }

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
          const { error } = await supabase.from('social_connections').update(row).eq('id', p.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('social_connections').insert(row);
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
          {platforms.map((platform, index) => (
            <PlatformCard
              key={`${platform.platform}-${index}`}
              platform={platform}
              index={index}
              onUpdate={updateField}
              onRemove={setRemoveDialogIndex}
            />
          ))}

          <AddPlatformButtons availablePlatforms={availablePlatforms} onAdd={addPlatform} />

          <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Social Metrics
          </Button>
        </CardContent>
      </Card>

      <RemovePlatformDialog
        removeIndex={removeDialogIndex}
        platforms={platforms}
        onConfirm={confirmRemovePlatform}
        onCancel={() => setRemoveDialogIndex(null)}
      />
    </>
  );
};

export default SocialMetricsForm;
