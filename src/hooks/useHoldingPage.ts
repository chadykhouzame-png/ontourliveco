import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HoldingState = { loading: boolean; enabled: boolean };

/**
 * Reads the `holding_page_enabled` flag from `site_settings` and stays in
 * sync via realtime. Defaults to `true` on error so we fail closed to the
 * holding page rather than accidentally exposing the app.
 */
export function useHoldingPage(): HoldingState {
  const [state, setState] = useState<HoldingState>({ loading: true, enabled: true });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'holding_page_enabled')
        .maybeSingle();
      if (!mounted) return;
      const enabled = data?.value === true || (data?.value as unknown) === 'true';
      setState({ loading: false, enabled: data ? enabled : true });
    };
    load();

    const channel = supabase
      .channel('site_settings_holding')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.holding_page_enabled' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { value?: unknown } | null;
          const v = row?.value;
          const enabled = v === true || v === 'true';
          setState({ loading: false, enabled });
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
