-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('artist', 'venue', 'admin');

-- Create genre enum for consistency
CREATE TYPE public.genre AS ENUM (
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats', 
  'amapiano', 'latin', 'pop', 'rock', 'jazz', 'soul', 'funk',
  'drum_and_bass', 'uk_garage', 'reggae', 'dancehall', 'other'
);

-- Create venue type enum
CREATE TYPE public.venue_type AS ENUM (
  'bar', 'club', 'restaurant', 'hotel', 'rooftop', 'lounge', 
  'festival', 'private_event', 'other'
);

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM (
  'pending', 'accepted', 'declined', 'cancelled'
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table (base for all users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create artists table
CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  artist_name TEXT NOT NULL,
  primary_city TEXT NOT NULL,
  bio TEXT,
  genres genre[] DEFAULT '{}',
  profile_image_url TEXT,
  instagram_url TEXT,
  soundcloud_url TEXT,
  spotify_url TEXT,
  fee_range_min INTEGER,
  fee_range_max INTEGER,
  show_fee_range BOOLEAN DEFAULT false,
  is_profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create venues table
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL,
  venue_type venue_type NOT NULL DEFAULT 'bar',
  capacity_min INTEGER,
  capacity_max INTEGER,
  description TEXT,
  music_preferences genre[] DEFAULT '{}',
  booking_nights TEXT[], -- e.g., ['Friday', 'Saturday']
  equipment_notes TEXT,
  profile_image_url TEXT,
  instagram_url TEXT,
  is_profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel_dates table (core feature)
CREATE TABLE public.travel_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  city TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create booking_requests table
CREATE TABLE public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TEXT,
  message TEXT,
  offer_amount INTEGER,
  status booking_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for artists
CREATE POLICY "Anyone can view artist profiles"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Artists can insert their own profile"
  ON public.artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Artists can update their own profile"
  ON public.artists FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for venues
CREATE POLICY "Anyone can view venue profiles"
  ON public.venues FOR SELECT
  USING (true);

CREATE POLICY "Venues can insert their own profile"
  ON public.venues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Venues can update their own profile"
  ON public.venues FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for travel_dates
CREATE POLICY "Anyone can view available travel dates"
  ON public.travel_dates FOR SELECT
  USING (true);

CREATE POLICY "Artists can manage their own travel dates"
  ON public.travel_dates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE id = artist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can update their own travel dates"
  ON public.travel_dates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE id = artist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can delete their own travel dates"
  ON public.travel_dates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE id = artist_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for booking_requests
CREATE POLICY "Artists can view their booking requests"
  ON public.booking_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE id = artist_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.venues 
      WHERE id = venue_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Venues can create booking requests"
  ON public.booking_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues 
      WHERE id = venue_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update booking requests"
  ON public.booking_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.artists 
      WHERE id = artist_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.venues 
      WHERE id = venue_id AND user_id = auth.uid()
    )
  );

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_travel_dates_updated_at
  BEFORE UPDATE ON public.travel_dates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_artists_primary_city ON public.artists(primary_city);
CREATE INDEX idx_artists_genres ON public.artists USING GIN(genres);
CREATE INDEX idx_venues_city ON public.venues(city);
CREATE INDEX idx_travel_dates_city_dates ON public.travel_dates(city, start_date, end_date);
CREATE INDEX idx_travel_dates_artist ON public.travel_dates(artist_id);
CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX idx_booking_requests_artist ON public.booking_requests(artist_id);
CREATE INDEX idx_booking_requests_venue ON public.booking_requests(venue_id);