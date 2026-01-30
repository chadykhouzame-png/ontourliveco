import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Music, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SelectRole = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
    // If user already has a role, redirect them
    if (!isLoading && user && userRole) {
      if (userRole === 'artist') {
        navigate('/artist/dashboard');
      } else if (userRole === 'venue') {
        navigate('/venue/dashboard');
      }
    }
  }, [user, userRole, isLoading, navigate]);

  const handleSelectRole = async (role: 'artist' | 'venue') => {
    if (!user) return;
    
    setIsSubmitting(true);

    try {
      // Create profile if it doesn't exist
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, email: user.email || '' });
        
        if (profileError) throw profileError;
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role });

      if (roleError) throw roleError;

      toast({
        title: "Welcome to On Tour!",
        description: `Let's set up your ${role} profile.`,
      });

      // Redirect to setup page
      if (role === 'artist') {
        navigate('/artist/setup');
      } else {
        navigate('/venue/setup');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error setting role',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to On Tour</h1>
          <p className="text-muted-foreground">How do you want to use the platform?</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card 
            className="bg-card border-border cursor-pointer hover:border-artist/50 transition-colors"
            onClick={() => !isSubmitting && handleSelectRole('artist')}
          >
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-artist/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-artist" />
              </div>
              <CardTitle>I'm an Artist</CardTitle>
              <CardDescription>
                Get discovered and booked by venues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-artist hover:bg-artist/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Setting up...' : 'Join as Artist'}
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="bg-card border-border cursor-pointer hover:border-venue/50 transition-colors"
            onClick={() => !isSubmitting && handleSelectRole('venue')}
          >
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-venue/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-venue" />
              </div>
              <CardTitle>I'm a Venue</CardTitle>
              <CardDescription>
                Find and book artists for your events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-venue hover:bg-venue/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Setting up...' : 'Join as Venue'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
