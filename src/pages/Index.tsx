import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Music, Building2, MapPin, Calendar, Star, MessageSquare, ArrowRight, Check, Mail, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { socialLinks } from "@/config/social";
import lockupHorizontalIvory from "@/assets/lockup-horizontal-ivory.png.asset.json";
import monogramIvory from "@/assets/monogram-ivory.png.asset.json";
import JoinListForm from "@/components/JoinListForm";
import EventHighlights from "@/components/EventHighlights";
import PhotoGallery from "@/components/PhotoGallery";
import FAQ from "@/components/FAQ";
import SiteFooter from "@/components/SiteFooter";


const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, userRole, isLoading } = useAuth();

  // Redirect logged-in users to their dashboard or role selection
  if (!isLoading && user) {
    if (userRole === 'artist') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome back!</h2>
            <Link to="/artist/dashboard">
              <Button className="bg-artist hover:bg-artist/90">
                Go to Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      );
    }
    if (userRole === 'venue') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome back!</h2>
            <Link to="/venue/dashboard">
              <Button className="bg-venue hover:bg-venue/90">
                Go to Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      );
    }
    // User is logged in but has no role - redirect to role selection
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Almost there!</h2>
          <p className="text-muted-foreground mb-6">Complete your account setup</p>
          <Link to="/select-role">
            <Button>
              Continue Setup
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      
      {/* Navigation - iOS frosted glass style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={lockupHorizontalIvory.url} alt="On Tour Live" className="h-10 md:h-12 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium">How It Works</a>
            <a href="#for-artists" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium">For Artists</a>
            <a href="#for-venues" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium">For Venues</a>
            <Link to="/search" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium">Search</Link>
          </div>
          <div className="flex items-center gap-4">
            {/* Social Icons */}
            <div className="hidden sm:flex items-center gap-2">
              <a 
                href={socialLinks.instagram.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                aria-label={socialLinks.instagram.label}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href={socialLinks.tiktok.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                aria-label={socialLinks.tiktok.label}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
            </div>
            <Link to="/search" className="hidden sm:block">
              <Button variant="secondary" size="sm" className="rounded-full px-5">Browse Artists</Button>
            </Link>
            
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="w-10 h-10">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 pt-12">
                <div className="flex flex-col gap-6">
                  {/* Navigation Links */}
                  <div className="flex flex-col gap-4">
                    <a 
                      href="#how-it-works" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-foreground hover:text-primary transition-colors duration-200 text-lg font-medium"
                    >
                      How It Works
                    </a>
                    <a 
                      href="#for-artists" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-foreground hover:text-primary transition-colors duration-200 text-lg font-medium"
                    >
                      For Artists
                    </a>
                    <a 
                      href="#for-venues" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-foreground hover:text-primary transition-colors duration-200 text-lg font-medium"
                    >
                      For Venues
                    </a>
                    <Link 
                      to="/search" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-foreground hover:text-primary transition-colors duration-200 text-lg font-medium"
                    >
                      Search
                    </Link>
                  </div>
                  
                  {/* CTA Button */}
                  <Link to="/search" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" className="w-full rounded-full">Browse Artists</Button>
                  </Link>
                  
                  {/* Social Icons */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-4">Follow us</p>
                    <div className="flex items-center gap-3">
                      <a 
                        href={socialLinks.instagram.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-200"
                        aria-label={socialLinks.instagram.label}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                        </svg>
                      </a>
                      <a 
                        href={socialLinks.facebook.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-200"
                        aria-label={socialLinks.facebook.label}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                        </svg>
                      </a>
                      <a 
                        href={socialLinks.tiktok.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-200"
                        aria-label={socialLinks.tiktok.label}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                      </a>
                      <a 
                        href={socialLinks.twitter.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-200"
                        aria-label={socialLinks.twitter.label}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                      <a 
                        href={socialLinks.linkedin.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-200"
                        aria-label={socialLinks.linkedin.label}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero — Cinematic Diptych */}
      <section className="relative overflow-hidden bg-noir pt-32 pb-24 md:pt-40 md:pb-32 border-b border-smoke/20">
        {/* Off-center champagne glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-40 blur-[120px]"
          style={{ background: 'hsl(var(--champagne) / 0.15)' }}
        />

        {/* Hairline corner marks */}
        <div aria-hidden className="absolute top-24 left-6 md:left-10 w-8 h-8 border-l border-t border-champagne/50" />
        <div aria-hidden className="absolute top-24 right-6 md:right-10 w-8 h-8 border-r border-t border-champagne/50" />
        <div aria-hidden className="absolute bottom-10 left-6 md:left-10 w-8 h-8 border-l border-b border-champagne/50" />
        <div aria-hidden className="absolute bottom-10 right-6 md:right-10 w-8 h-8 border-r border-b border-champagne/50" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-9 animate-fade-in">
              {/* Monogram + eyebrow row */}
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 border border-champagne rounded-brand flex items-center justify-center bg-noir-lift">
                  <img
                    src={monogramIvory.url}
                    alt=""
                    aria-hidden
                    className="h-6 w-auto"
                  />
                </div>
                <span className="uppercase tracking-label text-[10px] text-smoke">
                  The Booking Platform · Artists &amp; Venues
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display uppercase tracking-display text-ivory text-6xl md:text-8xl leading-[1.02] mb-4">
                On&nbsp;Tour<span className="text-champagne"> · </span>Live
              </h1>

              <p className="editorial text-2xl md:text-3xl text-smoke mb-8">The stage awaits.</p>

              <p className="max-w-xl text-ivory/80 text-base md:text-lg leading-relaxed mb-12">
                Venues find the artists already in town. Artists turn travel dates into
                booked nights. No DMs. No scrambling. Just the room, the sound, and the show.
              </p>

              {/* Trust chips — hairline borders, dot prefix removed for cleaner rhythm */}
              <div className="flex flex-wrap gap-3 mb-12">
                {['Direct booking', 'Secure payouts', 'Verified profiles', '5% platform fee'].map((label) => (
                  <div
                    key={label}
                    className="px-4 py-1.5 border border-smoke/35 rounded-brand text-[10px] uppercase tracking-label text-smoke"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link to="/join/artist">
                  <Button
                    size="lg"
                    className="bg-champagne text-noir hover:bg-champagne-deep hover:text-ivory rounded-brand px-10 py-4 tracking-[0.3em] uppercase text-[11px] font-semibold shadow-none"
                  >
                    Take your place
                  </Button>
                </Link>
                <Link to="/join/venue">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border border-ivory text-ivory bg-transparent hover:bg-ivory hover:text-noir rounded-brand px-10 py-4 tracking-[0.3em] uppercase text-[11px] font-semibold shadow-none"
                  >
                    Book the night
                  </Button>
                </Link>
              </div>

              <Link
                to="/search"
                className="mt-10 inline-block text-sm text-smoke hover:text-champagne underline-offset-4 hover:underline transition-colors"
              >
                Or browse the roster →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Role split — Diptych with champagne hairline */}
      <section className="relative bg-noir py-32">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="text-center mb-24">
            <p className="eyebrow mb-4">Choose your side of the stage</p>
            <h2 className="font-display uppercase tracking-[0.2em] text-ivory text-3xl md:text-4xl">
              Which room are you in?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 relative">
            {/* Vertical champagne rule */}
            <div aria-hidden className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-champagne/20" />

            {/* Artist side */}
            <div className="p-8 md:p-12 flex flex-col items-center text-center">
              <div className="mb-8 text-velvet font-display text-lg uppercase tracking-[0.4em]">
                01 / Profile
              </div>
              <h3 className="font-display text-3xl md:text-4xl uppercase tracking-display text-ivory mb-8">
                I'm an Artist
              </h3>
              <p className="text-smoke text-sm leading-relaxed max-w-sm mb-8">
                Going on tour? Get booked while you travel. Set your dates once — venues find you.
              </p>
              <ul className="space-y-4 mb-12 text-smoke text-sm tracking-wide">
                <li>Share your travel dates</li>
                <li>Showcase your EPK &amp; socials</li>
                <li>Get discovered by venues</li>
              </ul>
              <Link
                to="/join/artist"
                className="group flex items-center gap-4 text-[11px] uppercase tracking-[0.3em] text-champagne"
              >
                <span>Claim the stage</span>
                <span aria-hidden className="block w-8 h-px bg-champagne transition-all duration-300 group-hover:w-12" />
              </Link>
            </div>

            {/* Venue side */}
            <div className="p-8 md:p-12 flex flex-col items-center text-center border-t md:border-t-0 border-smoke/20">
              <div className="mb-8 text-velvet font-display text-lg uppercase tracking-[0.4em]">
                02 / Curation
              </div>
              <h3 className="font-display text-3xl md:text-4xl uppercase tracking-display text-ivory mb-8">
                I'm a Venue
              </h3>
              <p className="text-smoke text-sm leading-relaxed max-w-sm mb-8">
                See who's in town. Fill your dates. No more chasing DMs or last-minute scrambles.
              </p>
              <ul className="space-y-4 mb-12 text-smoke text-sm tracking-wide">
                <li>Browse artists by city + date</li>
                <li>View profiles &amp; reviews</li>
                <li>Book with confidence</li>
              </ul>
              <Link
                to="/join/venue"
                className="group flex items-center gap-4 text-[11px] uppercase tracking-[0.3em] text-champagne"
              >
                <span>Open the doors</span>
                <span aria-hidden className="block w-8 h-px bg-champagne transition-all duration-300 group-hover:w-12" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Legacy split hero — retained as role picker below the fold */}
      <section className="relative overflow-hidden bg-noir-lift border-t border-border/40 py-24">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="eyebrow mb-4">Choose your side of the stage</p>
            <h2 className="text-3xl md:text-4xl text-ivory">Which room are you in?</h2>
          </div>

          {/* Split CTA */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full stagger-children">
            {/* Artist Side */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-artist/30 to-artist/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <Card className="relative bg-card/60 backdrop-blur-xl border-border/30 hover:border-artist/50 transition-all duration-300 overflow-hidden rounded-3xl group-hover:scale-[1.02]">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-artist/20 rounded-2xl flex items-center justify-center mb-6">
                    <Music className="w-7 h-7 text-artist" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">I'm an Artist</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Going on tour? Get booked while you travel. Set your dates once — venues find you.
                  </p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-artist/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-artist" />
                      </div>
                      <span>Share your travel dates</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-artist/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-artist" />
                      </div>
                      <span>Showcase your EPK & socials</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-artist/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-artist" />
                      </div>
                      <span>Get discovered by venues</span>
                    </li>
                  </ul>
                  <Link to="/join/artist">
                    <Button className="w-full bg-artist hover:bg-artist/90 text-artist-foreground rounded-xl">
                      Join as Artist
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Venue Side */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-venue/30 to-venue/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <Card className="relative bg-card/60 backdrop-blur-xl border-border/30 hover:border-venue/50 transition-all duration-300 overflow-hidden rounded-3xl group-hover:scale-[1.02]">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-venue/20 rounded-2xl flex items-center justify-center mb-6">
                    <Building2 className="w-7 h-7 text-venue" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">I'm a Venue</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    See who's in town. Fill your dates. No more chasing DMs or last-minute scrambles.
                  </p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-venue/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-venue" />
                      </div>
                      <span>Browse artists by city + date</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-venue/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-venue" />
                      </div>
                      <span>View profiles & reviews</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-venue/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-venue" />
                      </div>
                      <span>Book with confidence</span>
                    </li>
                  </ul>
                  <Link to="/join/venue">
                    <Button className="w-full bg-venue hover:bg-venue/90 text-venue-foreground rounded-xl">
                      Join as Venue
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Event Highlights */}
      <EventHighlights />

      {/* Photo Gallery — Field Notes */}
      <PhotoGallery />

      {/* Join the list / Request the stage */}
      <section id="join" className="relative bg-noir py-24 border-t border-border/40">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">Before the doors open</p>
            <h2 className="font-display uppercase tracking-display text-ivory text-3xl md:text-5xl mb-4">
              Join the list
            </h2>
            <p className="editorial text-lg md:text-xl">Or request the stage — we're listening.</p>
          </div>
          <JoinListForm />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">Simple & Powerful</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">How On Tour Works</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16">
            {/* For Artists */}
            <div id="for-artists">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-artist/20 rounded-lg flex items-center justify-center">
                  <Music className="w-5 h-5 text-artist" />
                </div>
                <h3 className="text-2xl font-bold">For Artists</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: "01", title: "Create your profile", desc: "Add your genre, socials, EPK, and set your fee range." },
                  { step: "02", title: "Add travel dates", desc: "Tell us where you'll be and when you're available." },
                  { step: "03", title: "Get booking requests", desc: "Venues find you. No more chasing gigs." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="text-artist font-mono text-sm">{item.step}</span>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Venues */}
            <div id="for-venues">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-venue/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-venue" />
                </div>
                <h3 className="text-2xl font-bold">For Venues</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: "01", title: "Search by city + date", desc: "See who's in town and available for your dates." },
                  { step: "02", title: "View artist profiles", desc: "Check socials, listen to mixes, read reviews." },
                  { step: "03", title: "Send booking request", desc: "Connect directly. No middlemen." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="text-venue font-mono text-sm">{item.step}</span>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">Why On Tour</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Built for the Industry</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: MapPin,
                title: "Location-First",
                desc: "See who's in your city right now or arriving soon."
              },
              {
                icon: Calendar,
                title: "Real-Time Availability",
                desc: "No guessing. Know exactly who's free and when."
              },
              {
                icon: Star,
                title: "Two-Way Reviews",
                desc: "Artists review venues. Venues review artists. Trust builds."
              },
              {
                icon: MessageSquare,
                title: "Direct Messaging",
                desc: "No agents, no middlemen. Just you and the gig."
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-6">
                  <feature.icon className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem We Solve */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">The Problem</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">
              Booking Entertainment is Broken
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-artist" />
                Artists struggle with...
              </h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li>• Endless DMs and being ghosted</li>
                <li>• No visibility when travelling</li>
                <li>• "Let me know if anything comes up"</li>
                <li>• No credibility without connections</li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-venue" />
                Venues struggle with...
              </h3>
              <ul className="space-y-3 text-muted-foreground text-sm">
                <li>• Last-minute cancellations</li>
                <li>• No time to hunt on Instagram</li>
                <li>• Same recycled local talent</li>
                <li>• No way to verify quality</li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-xl font-semibold mb-2">On Tour fixes this.</p>
            <p className="text-muted-foreground">One platform. Both sides. Real accountability.</p>
          </div>
        </div>
      </section>

      {/* Closing CTA — framed proscenium with velvet undertone */}
      <section className="px-6 md:px-8 py-24 bg-noir">
        <div className="max-w-6xl mx-auto relative overflow-hidden rounded-brand border border-smoke/35 bg-noir-lift p-12 md:p-24">
          {/* Velvet accent bloom */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full blur-[60px]"
            style={{ background: 'hsl(var(--velvet) / 0.35)' }}
          />

          <div className="relative z-10 text-center">
            <p className="eyebrow mb-6">Take your place</p>
            <h2 className="font-display uppercase tracking-[0.2em] text-ivory text-4xl md:text-5xl mb-6">
              Your legacy begins tonight.
            </h2>
            <p className="editorial text-xl text-smoke mb-12">
              The industry has changed. Your standards haven't.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/join/artist">
                <Button
                  size="lg"
                  className="bg-champagne text-noir hover:bg-champagne-deep hover:text-ivory rounded-brand px-12 py-5 tracking-[0.3em] uppercase text-[11px] font-semibold shadow-none"
                >
                  Join as Artist
                </Button>
              </Link>
              <Link to="/join/venue">
                <Button
                  size="lg"
                  variant="outline"
                  className="border border-ivory text-ivory bg-transparent hover:bg-ivory hover:text-noir rounded-brand px-12 py-5 tracking-[0.3em] uppercase text-[11px] font-semibold shadow-none"
                >
                  Join as Venue
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Footer */}
      <SiteFooter />
    </div>
  );
};

export default Index;
