import { z } from 'zod';
import { Music, Instagram } from 'lucide-react';

export type SocialPlatform = 'spotify' | 'instagram' | 'tiktok' | 'soundcloud';

export interface PlatformMetrics {
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

export const PLATFORM_CONFIG: Record<SocialPlatform, {
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

export const ALL_PLATFORMS: SocialPlatform[] = ['spotify', 'instagram', 'tiktok', 'soundcloud'];

export const metricsSchema = z.object({
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

export const emptyMetrics = (platform: SocialPlatform): PlatformMetrics => ({
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

export const parseNum = (val: string): number | null => {
  if (!val.trim()) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

export const parseFloat_ = (val: string): number | null => {
  if (!val.trim()) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
};
