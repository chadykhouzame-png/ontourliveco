import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AnimatedRoutes from "@/components/AnimatedRoutes";
import FloatingActionButton from "@/components/FloatingActionButton";
import CookieConsent from "@/components/CookieConsent";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

import { useHoldingPage } from "@/hooks/useHoldingPage";

// Hide app-chrome (FAB + cookie banner) on the holding page so the
// First Light landing stays visually pristine. Applies to /waitlist and
// to / whenever the admin has the holding page enabled.
const AppChrome = () => {
  const { pathname } = useLocation();
  const { enabled: holdingEnabled } = useHoldingPage();
  if (pathname === "/waitlist") return null;
  if (pathname === "/" && holdingEnabled) return null;
  return (
    <>
      <FloatingActionButton />
      <CookieConsent />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AnimatedRoutes />
              <AppChrome />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
