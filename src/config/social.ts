// Centralized social media configuration
// Update URLs here to change them across the entire app

export const socialLinks = {
  instagram: {
    url: 'https://instagram.com/ontour.live',
    label: 'Follow us on Instagram',
  },
  facebook: {
    url: 'https://www.facebook.com/ontour.live',
    label: 'Follow us on Facebook',
  },
  tiktok: {
    url: 'https://tiktok.com/@ontour',
    label: 'Follow us on TikTok',
  },
  twitter: {
    url: 'https://x.com/ontour',
    label: 'Follow us on X',
  },
  linkedin: {
    url: 'https://linkedin.com/company/ontour',
    label: 'Follow us on LinkedIn',
  },
  email: {
    url: 'mailto:hello@ontour.com',
    label: 'Email us',
  },
} as const;

export type SocialPlatform = keyof typeof socialLinks;
