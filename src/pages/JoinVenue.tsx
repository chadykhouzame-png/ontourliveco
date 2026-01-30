import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { z } from 'zod';
import SocialLoginButtons from '@/components/SocialLoginButtons';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { signupSchema, loginSchema } from '@/lib/passwordValidation';
import { checkAccountLockout, recordLoginAttempt, formatLockoutMessage } from '@/hooks/useAccountLockout';

const JoinVenue = () => {
  const navigate = useNavigate();
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const { showErrorWithTitle } = useErrorHandler();
  
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Redirect if already logged in
  if (user) {
    navigate('/venue/setup');
    return null;
  }

  const validateForm = () => {
    try {
      // Use stricter validation for signup, simpler for login
      const schema = isLogin ? loginSchema : signupSchema;
      schema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'email') newErrors.email = err.message;
          if (err.path[0] === 'password') newErrors.password = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
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
        navigate('/venue/dashboard');
      } else {
        const { error } = await signUp(email, password, 'venue');
        if (error) throw error;
        
        // Send welcome email (fire and forget)
        supabase.functions.invoke('send-welcome-email', {
          body: { email, userType: 'venue' },
        }).catch(err => console.error('Failed to send welcome email:', err));
        
        toast({
          title: "Welcome to On Tour!",
          description: "Let's set up your venue profile.",
        });
        navigate('/venue/setup');
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
            <div className="w-14 h-14 bg-venue/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-venue" />
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome back' : 'Join as a Venue'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in to access your venue dashboard' 
                : 'Create your account and start discovering artists'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SocialLoginButtons variant="venue" />

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
                  placeholder="venue@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
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
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
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

              <Button 
                type="submit" 
                className="w-full bg-venue hover:bg-venue/90"
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
                to="/join/artist" 
                className="text-sm text-artist hover:underline"
              >
                Are you an artist? Join as an artist instead
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinVenue;
