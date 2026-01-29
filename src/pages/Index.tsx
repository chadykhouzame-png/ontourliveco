import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Building2, MapPin, Calendar, Star, MessageSquare, ArrowRight, Check, Instagram, Mail } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter">
            <span className="text-primary">ON</span>
            <span className="text-foreground">TOUR</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm">How It Works</a>
            <a href="#for-artists" className="text-muted-foreground hover:text-foreground transition-colors text-sm">For Artists</a>
            <a href="#for-venues" className="text-muted-foreground hover:text-foreground transition-colors text-sm">For Venues</a>
          </div>
          <Button size="sm">Get Early Access</Button>
        </div>
      </nav>

      {/* Hero Section - Split Screen */}
      <section className="min-h-screen pt-20 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-artist/10 via-transparent to-venue/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-artist/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-venue/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 min-h-[calc(100vh-80px)] flex flex-col justify-center">
          {/* Main headline */}
          <div className="text-center mb-16">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">
              The Booking Platform for Live Entertainment
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6">
              CONNECT.
              <br />
              <span className="text-primary">BOOK.</span>
              <br />
              PERFORM.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              On Tour connects venues with artists already on the move — 
              turning travel dates into booked gigs.
            </p>
          </div>

          {/* Split CTA */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            {/* Artist Side */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-artist/20 to-artist/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Card className="relative bg-card/50 border-border hover:border-artist/50 transition-all duration-300 overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-artist/20 rounded-xl flex items-center justify-center mb-6">
                    <Music className="w-7 h-7 text-artist" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">I'm an Artist</h2>
                  <p className="text-muted-foreground mb-6">
                    Going on tour? Get booked while you travel. Set your dates once — venues find you.
                  </p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Share your travel dates</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Showcase your EPK & socials</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Get discovered by venues</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-artist hover:bg-artist/90 text-artist-foreground">
                    Join as Artist
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Venue Side */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-venue/20 to-venue/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Card className="relative bg-card/50 border-border hover:border-venue/50 transition-all duration-300 overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-venue/20 rounded-xl flex items-center justify-center mb-6">
                    <Building2 className="w-7 h-7 text-venue" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">I'm a Venue</h2>
                  <p className="text-muted-foreground mb-6">
                    See who's in town. Fill your dates. No more chasing DMs or last-minute scrambles.
                  </p>
                  <ul className="space-y-3 mb-8 text-sm">
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Browse artists by city + date</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary" />
                      <span>View profiles & reviews</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Book with confidence</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-venue hover:bg-venue/90 text-venue-foreground">
                    Join as Venue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
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

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
            Be First on the Platform
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            We're launching soon. Get early access and be part of the movement 
            that's changing how entertainment gets booked.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Get Early Access
              <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-2xl font-black tracking-tighter">
              <span className="text-primary">ON</span>
              <span className="text-foreground">TOUR</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="mailto:hello@ontour.com" className="text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
            
            <p className="text-muted-foreground text-sm">
              © 2026 On Tour. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
