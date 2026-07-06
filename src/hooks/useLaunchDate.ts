import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads `launch_date` from `site_settings` and stays in sync via realtime.
 * Returns ISO string or null while loading / unset.
 */
export function useLaunchDate(): { loading: boolean; iso: string | null } {
  const [state, setState] = useState<{ loading: boolean; iso: string | null }>({
    loading: true,
    iso: null,
  });

  useEffect(() => {
    let mounted = true;

    const parse = (v: unknown): string | null =>
      typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null;

    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'launch_date')
        .maybeSingle();
      if (!mounted) return;
      setState({ loading: false, iso: parse(data?.value) });
    })();

    const channel = supabase
      .channel('site_settings_launch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.launch_date' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { value?: unknown } | null;
          setState({ loading: false, iso: parse(row?.value) });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}
