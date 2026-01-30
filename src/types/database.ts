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

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type AppRole = 'artist' | 'venue' | 'admin';

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
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  artist?: Artist;
  venue?: Venue;
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
};
