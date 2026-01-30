import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/hooks/use-toast';

interface SocialLoginButtonsProps {
  variant?: 'artist' | 'venue';
}

const SocialLoginButtons = ({ variant = 'artist' }: SocialLoginButtonsProps) => {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingApple, setIsLoadingApple] = useState(false);
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google sign-in failed',
        description: error.message || 'Something went wrong. Please try again.',
      });
      setIsLoadingGoogle(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoadingApple(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Apple sign-in failed',
        description: error.message || 'Something went wrong. Please try again.',
      });
      setIsLoadingApple(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={isLoadingGoogle || isLoadingApple}
      >
        {isLoadingGoogle ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleAppleLogin}
        disabled={isLoadingGoogle || isLoadingApple}
      >
        {isLoadingApple ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.09-.52-2.08-.54-3.23 0-1.44.68-2.2.53-3.06-.38C3.79 16.23 4.42 9.32 8.92 9.07c1.28.06 2.16.68 2.9.71.99-.2 1.95-.78 3.02-.68 1.28.1 2.25.58 2.88 1.47-2.65 1.59-2.27 5.07.3 6.18-.56 1.45-1.29 2.88-2.97 3.53zM12.03 9c-.16-2.23 1.69-4.15 3.87-4.32.3 2.48-2.09 4.52-3.87 4.32z" />
          </svg>
        )}
        Continue with Apple
      </Button>
    </div>
  );
};

export default SocialLoginButtons;
