/**
 * Sentry Error Tracking Configuration
 * 
 * To enable Sentry, set your DSN below. The DSN is a public key
 * and is safe to include in client-side code.
 * 
 * Get your DSN from: https://sentry.io -> Project Settings -> Client Keys (DSN)
 */

import * as Sentry from '@sentry/react';

// Replace with your Sentry DSN to enable Sentry tracking
// Leave empty to disable Sentry (will fall back to database-only tracking)
const SENTRY_DSN = '';

// Check if Sentry is configured
export const isSentryEnabled = Boolean(SENTRY_DSN);

/**
 * Initialize Sentry error tracking
 * Should be called early in the app lifecycle (before React renders)
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.log('[Sentry] DSN not configured - Sentry disabled');
    return;
  }

  // Only initialize in production
  if (import.meta.env.DEV) {
    console.log('[Sentry] Development mode - Sentry disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop',
      'Non-Error promise rejection',
      // Network errors that are expected
      'Failed to fetch',
      'NetworkError',
      'Load failed',
    ],
    
    // Attach user context when available
    beforeSend(event) {
      // You can modify the event here before sending
      return event;
    },
  });

  console.log('[Sentry] Initialized successfully');
}

/**
 * Set user context for Sentry (call after authentication)
 */
export function setSentryUser(user: { id: string; email?: string } | null): void {
  if (!isSentryEnabled || import.meta.env.DEV) return;
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Capture an exception with Sentry
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  }
): void {
  if (!isSentryEnabled || import.meta.env.DEV) return;
  
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    if (context?.level) {
      scope.setLevel(context.level);
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void {
  if (!isSentryEnabled || import.meta.env.DEV) return;
  
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  if (!isSentryEnabled || import.meta.env.DEV) return;
  
  Sentry.addBreadcrumb(breadcrumb);
}

// Export Sentry's ErrorBoundary for use in components
export { Sentry };
