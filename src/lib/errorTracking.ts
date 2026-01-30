/**
 * Error Tracking Service
 * Logs errors to the database via edge function for debugging and monitoring
 */

import { supabase } from '@/integrations/supabase/client';

interface ErrorLogPayload {
  error_code: string;
  error_message: string;
  context?: string;
  url?: string;
  user_agent?: string;
  stack_trace?: string;
  metadata?: Record<string, unknown>;
}

// Queue to batch errors and prevent overwhelming the server
let errorQueue: ErrorLogPayload[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 2000; // 2 seconds
const MAX_QUEUE_SIZE = 10;

/**
 * Log an error to the tracking system
 * Errors are queued and sent in batches for efficiency
 */
export function trackError(
  errorCode: string,
  errorMessage: string,
  options?: {
    context?: string;
    stackTrace?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  // Skip in development to avoid noise
  if (import.meta.env.DEV) {
    console.log('[ErrorTracking] Would log:', { errorCode, errorMessage, ...options });
    return;
  }

  const payload: ErrorLogPayload = {
    error_code: errorCode,
    error_message: errorMessage,
    context: options?.context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    stack_trace: options?.stackTrace,
    metadata: options?.metadata,
  };

  errorQueue.push(payload);

  // Flush immediately if queue is full
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    flushErrors();
  } else if (!flushTimeout) {
    // Otherwise, schedule a flush
    flushTimeout = setTimeout(flushErrors, FLUSH_INTERVAL);
  }
}

/**
 * Flush queued errors to the server
 */
async function flushErrors(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (errorQueue.length === 0) return;

  const errorsToSend = [...errorQueue];
  errorQueue = [];

  // Send each error (could be batched in a single call if edge function supports it)
  for (const error of errorsToSend) {
    try {
      await supabase.functions.invoke('log-error', {
        body: error,
      });
    } catch (e) {
      // Silently fail - we don't want error tracking to cause more errors
      console.error('[ErrorTracking] Failed to send error:', e);
    }
  }
}

/**
 * Track an error from an Error object
 */
export function trackErrorFromException(
  error: Error,
  context?: string,
  metadata?: Record<string, unknown>
): void {
  trackError(
    error.name || 'Error',
    error.message,
    {
      context,
      stackTrace: error.stack,
      metadata,
    }
  );
}

/**
 * Flush any pending errors immediately
 * Useful before page unload
 */
export function flushPendingErrors(): void {
  flushErrors();
}

// Flush errors before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingErrors);
  window.addEventListener('pagehide', flushPendingErrors);
}
