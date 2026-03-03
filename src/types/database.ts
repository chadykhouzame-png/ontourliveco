export type Genre = 
  | 'house' 
  | 'techno' 
  | 'disco' 
  | 'hip_hop' 
  | 'rnb' 
  | 'afrobeats'
  | 'amapiano' 
  | 'latin' 
  | 'pop' 
  | 'rock' 
  | 'jazz' 
  | 'soul' 
  | 'funk'
  | 'drum_and_bass' 
  | 'uk_garage' 
  | 'reggae' 
  | 'dancehall' 
  | 'other';

export type VenueType = 
  | 'bar' 
  | 'club' 
  | 'restaurant' 
  | 'hotel' 
  | 'rooftop' 
  | 'lounge'
  | 'festival' 
  | 'private_event' 
  | 'other';

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export type AppRole = 'artist' | 'venue' | 'admin';

export type EntertainmentRequestStatus = 'open' | 'filled' | 'cancelled';

export interface Artist {
  id: string;
  user_id: string;
  artist_name: string;
  primary_city: string;
  bio?: string;
  genres: Genre[];
  profile_image_url?: string;
  instagram_url?: string;
  soundcloud_url?: string;
  spotify_url?: string;
  fee_range_min?: number;
  fee_range_max?: number;
  show_fee_range: boolean;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  user_id: string;
  venue_name: string;
  city: string;
  venue_type: VenueType;
  capacity_min?: number;
  capacity_max?: number;
  description?: string;
  music_preferences: Genre[];
  booking_nights?: string[];
  equipment_notes?: string;
  profile_image_url?: string;
  instagram_url?: string;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface TravelDate {
  id: string;
  artist_id: string;
  city: string;
  start_date: string;
  end_date: string;
  is_available: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  artist?: Artist;
}

export interface BookingRequest {
  id: string;
  artist_id: string;
  venue_id: string;
  requested_date: string;
  requested_time?: string;
  message?: string;
  offer_amount?: number;
  counter_offer?: number;
  status: BookingStatus;
  payment_status?: string;
  payment_amount?: number;
  payment_intent_id?: string;
  platform_fee?: number;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
  artist?: Artist;
  venue?: Venue;
}

export interface EntertainmentRequest {
  id: string;
  venue_id: string;
  requested_date: string;
  start_time: string;
  end_time?: string;
  budget_min?: number;
  budget_max?: number;
  description?: string;
  requirements?: string;
  preferred_genres: Genre[];
  status: EntertainmentRequestStatus;
  created_at: string;
  updated_at: string;
  venue?: Venue;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'booking' | 'entertainment_request' | 'review';
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

export const GENRE_LABELS: Record<Genre, string> = {
  house: 'House',
  techno: 'Techno',
  disco: 'Disco',
  hip_hop: 'Hip Hop',
  rnb: 'R&B',
  afrobeats: 'Afrobeats',
  amapiano: 'Amapiano',
  latin: 'Latin',
  pop: 'Pop',
  rock: 'Rock',
  jazz: 'Jazz',
  soul: 'Soul',
  funk: 'Funk',
  drum_and_bass: 'Drum & Bass',
  uk_garage: 'UK Garage',
  reggae: 'Reggae',
  dancehall: 'Dancehall',
  other: 'Other',
};

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  bar: 'Bar',
  club: 'Club',
  restaurant: 'Restaurant',
  hotel: 'Hotel',
  rooftop: 'Rooftop',
  lounge: 'Lounge',
  festival: 'Festival',
  private_event: 'Private Event',
  other: 'Other',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const ENTERTAINMENT_REQUEST_STATUS_LABELS: Record<EntertainmentRequestStatus, string> = {
  open: 'Open',
  filled: 'Filled',
  cancelled: 'Cancelled',
};
