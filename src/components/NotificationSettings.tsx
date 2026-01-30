import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { executeWithRetry } = useErrorHandler();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const data = await executeWithRetry(
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('email_notifications_enabled')
            .eq('user_id', user?.id)
            .single();

          if (error) throw error;
          return data;
        },
        'fetching notification preferences'
      );
      
      setEmailEnabled(data?.email_notifications_enabled ?? true);
    } catch {
      // Error already shown by executeWithRetry
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!user) return;
    
    setIsSaving(true);
    setEmailEnabled(enabled);

    try {
      await executeWithRetry(
        async () => {
          const { error } = await supabase
            .from('profiles')
            .update({ email_notifications_enabled: enabled })
            .eq('user_id', user.id);

          if (error) throw error;
        },
        'updating notification preferences'
      );

      toast({
        title: enabled ? 'Email notifications enabled' : 'Email notifications disabled',
        description: enabled 
          ? "You'll receive email updates for bookings and requests."
          : "You'll only receive in-app notifications.",
      });
    } catch {
      setEmailEnabled(!enabled); // Revert on error
      // Error already shown by executeWithRetry
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-6">
          <div className="animate-pulse h-12 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive updates about bookings and requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="email-notifications" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive booking requests, counter-offers, and updates via email
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={emailEnabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
        </div>
        
        <p className="text-xs text-muted-foreground">
          In-app notifications are always enabled to keep you updated while using the platform.
        </p>
      </CardContent>
    </Card>
  );
}
