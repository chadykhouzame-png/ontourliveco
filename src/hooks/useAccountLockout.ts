import { supabase } from '@/integrations/supabase/client';

interface LockoutStatus {
  locked: boolean;
  remaining_attempts: number;
  lockout_until: string | null;
  minutes_remaining: number;
}

/**
 * Check if an account is locked due to too many failed login attempts
 */
export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
  try {
    const { data, error } = await supabase.rpc('check_account_lockout', {
      p_email: email,
    });

    if (error) {
      console.error('Error checking lockout:', error);
      // Fail open - don't block login if we can't check
      return { locked: false, remaining_attempts: 5, lockout_until: null, minutes_remaining: 0 };
    }

    return data as unknown as LockoutStatus;
  } catch (err) {
    console.error('Error in checkAccountLockout:', err);
    return { locked: false, remaining_attempts: 5, lockout_until: null, minutes_remaining: 0 };
  }
}

/**
 * Record a login attempt (success or failure)
 */
export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_login_attempt', {
      p_email: email,
      p_success: success,
    });

    if (error) {
      console.error('Error recording login attempt:', error);
    }
  } catch (err) {
    console.error('Error in recordLoginAttempt:', err);
  }
}

/**
 * Format the lockout message for display
 */
export function formatLockoutMessage(minutesRemaining: number): string {
  const mins = Math.ceil(minutesRemaining);
  if (mins <= 1) {
    return 'less than a minute';
  }
  return `${mins} minute${mins === 1 ? '' : 's'}`;
}
