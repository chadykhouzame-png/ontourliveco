import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Music, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { z } from 'zod';
import SocialLoginButtons from '@/components/SocialLoginButtons';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { signupSchema, loginSchema } from '@/lib/passwordValidation';
import { checkAccountLockout, recordLoginAttempt, formatLockoutMessage } from '@/hooks/useAccountLockout';
import { Genre, GENRE_LABELS } from '@/types/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GENRES: Genre[] = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats',
  'amapiano', 'latin', 'pop', 'rock', 'jazz', 'soul', 'funk',
  'drum_and_bass', 'uk_garage', 'reggae', 'dancehall', 'other'
];

const JoinArtist = () => {
  const navigate = useNavigate();
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const { showErrorWithTitle } = useErrorHandler();
  
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  
  // Signup-only fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<Genre | ''>('');

  // Redirect if already logged in
  if (user) {
    navigate('/artist/setup');
    return null;
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      const schema = isLogin ? loginSchema : signupSchema;
      schema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') newErrors.email = err.message;
          if (err.path[0] === 'password') newErrors.password = err.message;
        });
      }
    }

    if (!isLogin) {
      if (!firstName.trim()) newErrors.firstName = 'First name is required';
      if (!lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!city.trim()) newErrors.city = 'City is required';
      if (age && (isNaN(Number(age)) || Number(age) < 16 || Number(age) > 100)) {
        newErrors.age = 'Age must be between 16 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setLockoutMessage(null);

    try {
      if (isLogin) {
        // Check for account lockout before attempting login
        const lockoutStatus = await checkAccountLockout(email);
        
        if (lockoutStatus.locked) {
          setLockoutMessage(`Account temporarily locked. Try again in ${formatLockoutMessage(lockoutStatus.minutes_remaining)}.`);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        
        if (error) {
          // Record failed attempt
          await recordLoginAttempt(email, false);
          
          // Update remaining attempts display
          const newStatus = await checkAccountLockout(email);
          if (newStatus.locked) {
            setLockoutMessage(`Account temporarily locked. Try again in ${formatLockoutMessage(newStatus.minutes_remaining)}.`);
          } else if (newStatus.remaining_attempts <= 3) {
            setRemainingAttempts(newStatus.remaining_attempts);
          }
          
          throw error;
        }
        
        // Record successful login (clears failed attempts)
        await recordLoginAttempt(email, true);
        navigate('/artist/dashboard');
      } else {
        const { error, confirmEmail } = await signUp(email, password, 'artist');
        if (error) throw error;
        
        // Save extra signup fields to user metadata for use during setup
        // We store them in metadata since the artist profile row is created by the setup page
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase.auth.updateUser({
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              age: age ? Number(age) : null,
              city: city.trim(),
              mobile: mobile.trim(),
              preferred_genre: selectedGenre || null,
            }
          });
        }
        
        // Send welcome email (fire and forget)
        supabase.functions.invoke('send-welcome-email', {
          body: { email, userType: 'artist' },
        }).catch(err => console.error('Failed to send welcome email:', err));
        
        if (confirmEmail) {
          toast({
            title: "Check your email!",
            description: "We've sent you a confirmation link. Please verify your email to continue.",
          });
        } else {
          toast({
            title: "Welcome to On Tour!",
            description: "Let's set up your artist profile.",
          });
          navigate('/artist/setup');
        }
      }
    } catch (error: unknown) {
      showErrorWithTitle(error, isLogin ? "Login failed" : "Sign up failed", 'auth');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {lockoutMessage && (
          <Alert variant="destructive" className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertDescription>{lockoutMessage}</AlertDescription>
          </Alert>
        )}

        {remainingAttempts !== null && remainingAttempts <= 3 && !lockoutMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Warning: {remainingAttempts} login attempt{remainingAttempts !== 1 ? 's' : ''} remaining before account lockout.
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <div className="w-14 h-14 bg-artist/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Music className="w-7 h-7 text-artist" />
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome back' : 'Join as an Artist'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in to access your artist dashboard' 
                : 'Create your account and start getting booked'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SocialLoginButtons variant="artist" />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`sentry-mask ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`sentry-mask ${errors.password ? 'border-destructive pr-10' : 'pr-10'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                {!isLogin && <PasswordStrengthIndicator password={password} />}
              </div>

              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={errors.firstName ? 'border-destructive' : ''}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-destructive">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={errors.lastName ? 'border-destructive' : ''}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="25"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className={errors.age ? 'border-destructive' : ''}
                        min={16}
                        max={100}
                      />
                      {errors.age && (
                        <p className="text-sm text-destructive">{errors.age}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="+44 7700 900000"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="London"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={errors.city ? 'border-destructive' : ''}
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive">{errors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genre">Music Genre</Label>
                    <Select value={selectedGenre} onValueChange={(val) => setSelectedGenre(val as Genre)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRES.map((genre) => (
                          <SelectItem key={genre} value={genre}>
                            {GENRE_LABELS[genre]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full bg-artist hover:bg-artist/90"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground block w-full"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'
                }
              </button>
              {isLogin && (
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-primary block"
                >
                  Forgot your password?
                </Link>
              )}
            </div>

            <div className="mt-4 text-center">
              <Link 
                to="/join/venue" 
                className="text-sm text-venue hover:underline"
              >
                Looking to book artists? Join as a venue instead
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinArtist;
