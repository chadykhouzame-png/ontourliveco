import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import JoinArtist from "./pages/JoinArtist";
import JoinVenue from "./pages/JoinVenue";
import SelectRole from "./pages/SelectRole";
import ArtistSetup from "./pages/ArtistSetup";
import VenueSetup from "./pages/VenueSetup";
import ArtistTravel from "./pages/ArtistTravel";
import ArtistDashboard from "./pages/ArtistDashboard";
import VenueDashboard from "./pages/VenueDashboard";
import SearchArtists from "./pages/SearchArtists";
import ArtistProfile from "./pages/ArtistProfile";
import VenueProfile from "./pages/VenueProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Auth Routes */}
            <Route path="/join/artist" element={<JoinArtist />} />
            <Route path="/join/venue" element={<JoinVenue />} />
            <Route path="/select-role" element={<SelectRole />} />
            
            {/* Artist Routes */}
            <Route path="/artist/setup" element={<ArtistSetup />} />
            <Route path="/artist/travel" element={<ArtistTravel />} />
            <Route path="/artist/dashboard" element={<ArtistDashboard />} />
            <Route path="/artist/:id" element={<ArtistProfile />} />
            
            {/* Venue Routes */}
            <Route path="/venue/setup" element={<VenueSetup />} />
            <Route path="/venue/dashboard" element={<VenueDashboard />} />
            <Route path="/venue/:id" element={<VenueProfile />} />
            
            {/* Search */}
            <Route path="/search" element={<SearchArtists />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
