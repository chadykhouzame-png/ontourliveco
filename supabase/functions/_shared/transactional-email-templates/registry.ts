import type { ComponentType } from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as waitlistArtistConfirmation } from './waitlist-artist-confirmation.tsx'
import { template as waitlistVenueConfirmation } from './waitlist-venue-confirmation.tsx'

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'waitlist-artist-confirmation': waitlistArtistConfirmation,
  'waitlist-venue-confirmation': waitlistVenueConfirmation,
}
