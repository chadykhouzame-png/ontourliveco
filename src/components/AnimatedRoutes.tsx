import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import PageTransition from './PageTransition';
import RouteErrorBoundary from './RouteErrorBoundary';

import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import JoinArtist from '@/pages/JoinArtist';
import JoinVenue from '@/pages/JoinVenue';
import SelectRole from '@/pages/SelectRole';
import ArtistSetup from '@/pages/ArtistSetup';
import VenueSetup from '@/pages/VenueSetup';
import ArtistTravel from '@/pages/ArtistTravel';
import ArtistDashboard from '@/pages/ArtistDashboard';
import VenueDashboard from '@/pages/VenueDashboard';
import SearchArtists from '@/pages/SearchArtists';
import SearchVenues from '@/pages/SearchVenues';
import ArtistProfile from '@/pages/ArtistProfile';
import VenueProfile from '@/pages/VenueProfile';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Messages from '@/pages/Messages';

// Wrapper that combines PageTransition with RouteErrorBoundary
const ProtectedRoute = ({ children }: { children: ReactNode }) => (
  <RouteErrorBoundary>
    <PageTransition>{children}</PageTransition>
  </RouteErrorBoundary>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        
        {/* Auth Routes */}
        <Route path="/join/artist" element={<ProtectedRoute><JoinArtist /></ProtectedRoute>} />
        <Route path="/join/venue" element={<ProtectedRoute><JoinVenue /></ProtectedRoute>} />
        <Route path="/select-role" element={<ProtectedRoute><SelectRole /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ProtectedRoute><ForgotPassword /></ProtectedRoute>} />
        <Route path="/reset-password" element={<ProtectedRoute><ResetPassword /></ProtectedRoute>} />
        
        {/* Artist Routes */}
        <Route path="/artist/setup" element={<ProtectedRoute><ArtistSetup /></ProtectedRoute>} />
        <Route path="/artist/travel" element={<ProtectedRoute><ArtistTravel /></ProtectedRoute>} />
        <Route path="/artist/dashboard" element={<ProtectedRoute><ArtistDashboard /></ProtectedRoute>} />
        <Route path="/artist/:id" element={<ProtectedRoute><ArtistProfile /></ProtectedRoute>} />
        
        {/* Venue Routes */}
        <Route path="/venue/setup" element={<ProtectedRoute><VenueSetup /></ProtectedRoute>} />
        <Route path="/venue/dashboard" element={<ProtectedRoute><VenueDashboard /></ProtectedRoute>} />
        <Route path="/venue/:id" element={<ProtectedRoute><VenueProfile /></ProtectedRoute>} />
        
        {/* Search */}
        <Route path="/search" element={<ProtectedRoute><SearchArtists /></ProtectedRoute>} />
        <Route path="/search/venues" element={<ProtectedRoute><SearchVenues /></ProtectedRoute>} />
        
        {/* Messaging */}
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        
        {/* Catch-all */}
        <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
