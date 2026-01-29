import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Users, Star, ArrowRight, Phone, Mail, Instagram } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-primary">ON</span>
            <span className="text-accent-foreground">TOUR</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#destinations" className="text-muted-foreground hover:text-foreground transition-colors">Destinations</a>
            <a href="#experiences" className="text-muted-foreground hover:text-foreground transition-colors">Experiences</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
          <Button className="hidden md:inline-flex">Book Now</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          <p className="text-primary font-medium tracking-widest uppercase mb-4 animate-fade-in">
            Adventure Awaits
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in">
            Explore the World
            <br />
            <span className="text-primary">Your Way</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in">
            Curated experiences, unforgettable destinations, and journeys that transform. 
            Let us take you there.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Your Journey
              <ArrowRight className="ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              View Destinations
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
            <div className="w-1 h-3 bg-muted-foreground rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "50+", label: "Destinations" },
              { number: "10K+", label: "Happy Travelers" },
              { number: "8+", label: "Years Experience" },
              { number: "4.9", label: "Average Rating" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-primary">{stat.number}</p>
                <p className="text-muted-foreground mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section id="destinations" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium tracking-widest uppercase mb-4">Popular Destinations</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Where Will You Go?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Bali, Indonesia", tag: "Tropical Paradise", price: "From $1,299" },
              { name: "Santorini, Greece", tag: "Mediterranean Dream", price: "From $1,599" },
              { name: "Kyoto, Japan", tag: "Cultural Heritage", price: "From $1,899" },
              { name: "Patagonia, Chile", tag: "Wild Adventure", price: "From $2,199" },
              { name: "Marrakech, Morocco", tag: "Exotic Escape", price: "From $999" },
              { name: "Iceland", tag: "Northern Wonders", price: "From $1,799" },
            ].map((dest, i) => (
              <Card key={i} className="group cursor-pointer overflow-hidden border-0 bg-secondary/50 hover:bg-secondary transition-all duration-300">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-primary/40 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-6">
                    <p className="text-xs text-primary font-medium tracking-wider uppercase">{dest.tag}</p>
                    <h3 className="text-xl font-semibold mt-2 group-hover:text-primary transition-colors">{dest.name}</h3>
                    <p className="text-muted-foreground mt-2">{dest.price}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Experiences Section */}
      <section id="experiences" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium tracking-widest uppercase mb-4">Why Choose Us</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">The On Tour Experience</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Expert Guides",
                description: "Travel with passionate locals who know every hidden gem and secret spot."
              },
              {
                icon: Calendar,
                title: "Flexible Booking",
                description: "Plans change. We get it. Enjoy free cancellation up to 48 hours before."
              },
              {
                icon: Star,
                title: "Curated Experiences",
                description: "Every trip is handcrafted to deliver authentic, unforgettable moments."
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-background border-border/50 text-center p-8">
                <CardContent className="p-0">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Ready for Your Next Adventure?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join thousands of travelers who've discovered the world with On Tour. 
            Your journey starts with a single click.
          </p>
          <Button size="lg" className="text-lg px-10 py-6">
            Plan Your Trip
            <ArrowRight className="ml-2" />
          </Button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            <div id="about">
              <p className="text-primary font-medium tracking-widest uppercase mb-4">About On Tour</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                We Believe in Transformative Travel
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Founded by travelers, for travelers. We're not just about getting you from A to B — 
                we're about the stories you'll tell, the connections you'll make, and the person 
                you'll become along the way.
              </p>
              <p className="text-muted-foreground text-lg">
                Every tour is designed with purpose, sustainability, and authentic experiences at its heart.
              </p>
            </div>
            
            <div>
              <p className="text-primary font-medium tracking-widest uppercase mb-4">Get in Touch</p>
              <h3 className="text-2xl font-semibold mb-6">Let's Start Planning</h3>
              
              <div className="space-y-4">
                <a href="tel:+1234567890" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="w-5 h-5 text-primary" />
                  +1 (234) 567-890
                </a>
                <a href="mailto:hello@ontour.com" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="w-5 h-5 text-primary" />
                  hello@ontour.com
                </a>
                <a href="#" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors">
                  <Instagram className="w-5 h-5 text-primary" />
                  @ontour
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold tracking-tight">
            <span className="text-primary">ON</span>
            <span className="text-accent-foreground">TOUR</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 On Tour. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
