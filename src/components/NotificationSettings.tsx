import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Mail, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface NotificationPreferences {
  emailEnabled: boolean;
  soundEnabled: boolean;
}

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { executeWithRetry } = useErrorHandler();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    soundEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);

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
            .select('email_notifications_enabled, sound_notifications_enabled')
            .eq('user_id', user?.id)
            .single();

          if (error) throw error;
          return data;
        },
        'fetching notification preferences'
      );
      
      setPreferences({
        emailEnabled: data?.email_notifications_enabled ?? true,
        soundEnabled: data?.sound_notifications_enabled ?? true,
      });
    } catch {
      // Error already shown by executeWithRetry
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (field: 'email' | 'sound', enabled: boolean) => {
    if (!user) return;
    
    const dbField = field === 'email' ? 'email_notifications_enabled' : 'sound_notifications_enabled';
    const prefKey = field === 'email' ? 'emailEnabled' : 'soundEnabled';
    
    setSavingField(field);
    setPreferences(prev => ({ ...prev, [prefKey]: enabled }));

    try {
      await executeWithRetry(
        async () => {
          const { error } = await supabase
            .from('profiles')
            .update({ [dbField]: enabled })
            .eq('user_id', user.id);

          if (error) throw error;
        },
        `updating ${field} notification preferences`
      );

      const messages = {
        email: {
          enabled: { title: 'Email notifications enabled', desc: "You'll receive email updates for bookings and requests." },
          disabled: { title: 'Email notifications disabled', desc: "You'll only receive in-app notifications." },
        },
        sound: {
          enabled: { title: 'Sound notifications enabled', desc: "You'll hear a sound when new requests arrive." },
          disabled: { title: 'Sound notifications disabled', desc: "Sound alerts are now muted." },
        },
      };

      const msg = messages[field][enabled ? 'enabled' : 'disabled'];
      toast({ title: msg.title, description: msg.desc });
    } catch {
      setPreferences(prev => ({ ...prev, [prefKey]: !enabled }));
      // Error already shown by executeWithRetry
    } finally {
      setSavingField(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
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
            checked={preferences.emailEnabled}
            onCheckedChange={(enabled) => handleToggle('email', enabled)}
            disabled={savingField === 'email'}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label htmlFor="sound-notifications" className="text-base font-medium">
                Sound Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when new booking requests arrive
              </p>
            </div>
          </div>
          <Switch
            id="sound-notifications"
            checked={preferences.soundEnabled}
            onCheckedChange={(enabled) => handleToggle('sound', enabled)}
            disabled={savingField === 'sound'}
          />
        </div>
        
        <p className="text-xs text-muted-foreground">
          In-app notifications are always enabled to keep you updated while using the platform.
        </p>
      </CardContent>
    </Card>
  );
}