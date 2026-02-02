import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseBookingNotificationsOptions {
  entityId: string | undefined;
  entityType: 'artist' | 'venue';
  enabled?: boolean;
}

export function useBookingNotifications({ 
  entityId, 
  entityType, 
  enabled = true 
}: UseBookingNotificationsOptions) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');

  // Initialize audio element
  useEffect(() => {
    // Create audio element with a pleasant notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWY2Z5W0xZJtQCSVzt/Fo2E6MYnRxqNrNQ+M09/IoGc3J43FwJJkNhCO0dSuglc5FIu8rIhbNhKNxbqRYjcFiLykjmNAGIuwsop1TDIRgqWih2xJNRF8oJWDelMxCHqakIpmPxV0lIuBdFk2DHiUjYNvTjUOeJWPhXJLNgt1k4yEckwyDneTjIRySzILdZSMhHFLMwx2k4yEcksyCnWUjIRxSzMLdpOMhHJLMgt1lIyEcUsyC3WUjIRySzILdZSMhHJLMgt1lIyEcksyC3WUjIRySzILdZSMhHJLMgt1lIyEcksyC3WUjIRySzILdZSMhHJLMgt1lIyEcksyC3WUjIRySzILdZOMhHJLMgt1lIyEcksyC3WUjIRySzILdZSMhHJLMgt1lIyEckoyC3WUjIRySzMLdpOMhHJLMgt1lIyEcksyC3WUjIRySjILdZSMhHJKMgt2lIyEckoyC3aUjIRySjILdpSMhHFKMgt2lIyEcUoyC3aUjIRxSjILdpSMhHFKMgt2lIyEcUoyC3aUjYRxSjILdpSNhHFKMQt2lI2EcEoxC3aUjYRwSjELdpSNhHBKMQt2lI2EcEoxC3aUjYRwSjELdpSNhHBKMQt2lI2DcEoxC3aUjYNwSjELdpSNg3BKMQt2lI2DcEoxC3aUjYNwSjELdpSNg3BKMQt2lI2DcEoxC3aUjYNwSjELdpSNg29KMQt2lI2Db0oxC3aVjYNvSjELdpWNg29KMQt2lY2Db0oxC3aVjYNvSjALdpWNg29KMAt2lY2Db0owC3aVjYNvSjALdpWNg29KMAt2lY2Db0owC3aVjYNvSjALdpWNg29KMAt2lY2Db0owC3aVjYNvSjALdpWNg29KMAt2lY2Db0owC3aVjYNvSjALdpWNg29KMAt2lY2Db0owC3aVjYNvSjALdpWMg29KMAt2lYyDb0owC3aVjINvSjALdpWMg29KMAt2lYyDb0owC3aVjINvSjALdpWMg29KMAt2lYyDb0owC3aVjINvSjALdpWMg29KMAt2lYyDb0owC3aVjINvSjALdpWMg29KMAt1lYyDb0owC3WVjINvSjALdZWMg29KMAt1lYyDb0owC3WVjINvSjALdZWMg29KMAt1lYyDb0owC3WVjINvSjALdZWMg29KMAt1lYyDb0owC3WVjINvSjALdZWMg29KMAt1lYyDb0owC3WVjINvSjALdZWMg29KMAt1lYyDb0owC3WVjINvSjALdZWMg29JMAt1lYyDb0kwC3WVjINvSTALdZWMg29JMAt1lYyDb0kwC3WVjINvSTALdZWMg29JMAt1lYyDb0kwC3WVjINvSTALdZWMg29JMAt1lYyDb0kwC3WVjINvSTALdZWMg29JMAt1lYyDb0kwCw==');
    audioRef.current.volume = 0.5;

    // Check and request notification permission
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          permissionRef.current = permission;
        });
      }
    }

    return () => {
      audioRef.current = null;
    };
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed (user hasn't interacted with page yet)
      });
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && permissionRef.current === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.png',
        tag: 'booking-request',
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }, []);

  const notifyNewBooking = useCallback((artistOrVenueName: string, date: string) => {
    playSound();
    
    const title = 'New Booking Request';
    const body = entityType === 'artist' 
      ? `${artistOrVenueName} wants to book you for ${date}`
      : `${artistOrVenueName} is available for ${date}`;
    
    showBrowserNotification(title, body);
    
    // Also show in-app toast
    toast.info(title, {
      description: body,
      duration: 5000,
    });
  }, [entityType, playSound, showBrowserNotification]);

  // Subscribe to new booking requests
  useEffect(() => {
    if (!user || !entityId || !enabled) return;

    const filterColumn = entityType === 'artist' ? 'artist_id' : 'venue_id';
    
    const channel = supabase
      .channel(`booking-notifications-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_requests',
          filter: `${filterColumn}=eq.${entityId}`,
        },
        async (payload) => {
          const newBooking = payload.new as {
            artist_id: string;
            venue_id: string;
            requested_date: string;
          };

          // Fetch the name of the other party
          let name = 'Someone';
          
          if (entityType === 'artist') {
            // Artist receiving booking from venue
            const { data: venue } = await supabase
              .from('venues')
              .select('venue_name')
              .eq('id', newBooking.venue_id)
              .single();
            if (venue) name = venue.venue_name;
          } else {
            // Venue receiving booking from... actually venues initiate bookings
            // This would be for counter-offers or status changes
            const { data: artist } = await supabase
              .from('artists')
              .select('artist_name')
              .eq('id', newBooking.artist_id)
              .single();
            if (artist) name = artist.artist_name;
          }

          notifyNewBooking(name, newBooking.requested_date);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, entityId, entityType, enabled, notifyNewBooking]);

  return {
    playSound,
    showBrowserNotification,
    requestPermission: useCallback(async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        permissionRef.current = permission;
        return permission;
      }
      return permissionRef.current;
    }, []),
  };
}
