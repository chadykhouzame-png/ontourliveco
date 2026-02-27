import { useEffect, useRef, useCallback, useState } from 'react';
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
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fetch sound preference from profile
  useEffect(() => {
    if (!user) return;

    const fetchSoundPreference = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('sound_notifications_enabled')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setSoundEnabled(data.sound_notifications_enabled ?? true);
      }
    };

    fetchSoundPreference();

    // Subscribe to preference changes
    const channel = supabase
      .channel(`sound-pref-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as { sound_notifications_enabled?: boolean };
          if (typeof newData.sound_notifications_enabled === 'boolean') {
            setSoundEnabled(newData.sound_notifications_enabled);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Initialize audio element
  useEffect(() => {
    // Create audio element with a pleasant notification chime
    // Generate a two-tone chime using AudioContext for a richer sound
    const createNotificationSound = (): HTMLAudioElement => {
      try {
        const sampleRate = 44100;
        const duration = 0.6;
        const numSamples = Math.floor(sampleRate * duration);
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = numSamples * blockAlign;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        // Generate a two-tone chime (E5 → G5)
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          const envelope = Math.exp(-t * 5) * Math.max(0, 1 - t / duration);
          const freq1 = 659.25; // E5
          const freq2 = 783.99; // G5
          const crossfade = Math.min(1, t * 5);
          const sample =
            envelope * (
              Math.sin(2 * Math.PI * freq1 * t) * (1 - crossfade * 0.5) +
              Math.sin(2 * Math.PI * freq2 * t) * crossfade * 0.7 +
              Math.sin(2 * Math.PI * freq1 * 2 * t) * 0.15 * envelope
            );
          const clamped = Math.max(-1, Math.min(1, sample));
          view.setInt16(44 + i * 2, clamped * 0x7fff, true);
        }

        const blob = new Blob([buffer], { type: 'audio/wav' });
        return new Audio(URL.createObjectURL(blob));
      } catch {
        // Fallback to silent audio if generation fails
        return new Audio();
      }
    };

    audioRef.current = createNotificationSound();
    audioRef.current.volume = 0.6;

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
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Audio play failed (user hasn't interacted with page yet)
      });
    }
  }, [soundEnabled]);

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
    soundEnabled,
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
