import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';

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
import ArtistProfile from '@/pages/ArtistProfile';
import VenueProfile from '@/pages/VenueProfile';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        
        {/* Auth Routes */}
        <Route path="/join/artist" element={<PageTransition><JoinArtist /></PageTransition>} />
        <Route path="/join/venue" element={<PageTransition><JoinVenue /></PageTransition>} />
        <Route path="/select-role" element={<PageTransition><SelectRole /></PageTransition>} />
        
        {/* Artist Routes */}
        <Route path="/artist/setup" element={<PageTransition><ArtistSetup /></PageTransition>} />
        <Route path="/artist/travel" element={<PageTransition><ArtistTravel /></PageTransition>} />
        <Route path="/artist/dashboard" element={<PageTransition><ArtistDashboard /></PageTransition>} />
        <Route path="/artist/:id" element={<PageTransition><ArtistProfile /></PageTransition>} />
        
        {/* Venue Routes */}
        <Route path="/venue/setup" element={<PageTransition><VenueSetup /></PageTransition>} />
        <Route path="/venue/dashboard" element={<PageTransition><VenueDashboard /></PageTransition>} />
        <Route path="/venue/:id" element={<PageTransition><VenueProfile /></PageTransition>} />
        
        {/* Search */}
        <Route path="/search" element={<PageTransition><SearchArtists /></PageTransition>} />
        
        {/* Catch-all */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
