/**
 * Sentry Error & Performance Monitoring Configuration
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

// Performance thresholds (in milliseconds)
const SLOW_PAGE_LOAD_THRESHOLD = 3000;
const SLOW_API_CALL_THRESHOLD = 2000;

// Check if Sentry is configured
export const isSentryEnabled = Boolean(SENTRY_DSN);

/**
 * Initialize Sentry error and performance tracking
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
    
    // Integrations for performance monitoring
    integrations: [
      Sentry.browserTracingIntegration({
        // Track navigation and page loads
        enableInp: true,
      }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance monitoring - sample rates
    tracesSampleRate: 0.2, // 20% of transactions for performance data
    
    // Profile slow transactions
    profilesSampleRate: 0.1, // 10% of sampled transactions
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      'AbortError',
    ],
    
    // Custom event processing
    beforeSend(event) {
      return event;
    },
    
    // Custom transaction processing for performance
    beforeSendTransaction(event) {
      // Tag slow transactions
      const duration = event.timestamp && event.start_timestamp
        ? (event.timestamp - event.start_timestamp) * 1000
        : 0;
      
      if (duration > SLOW_PAGE_LOAD_THRESHOLD) {
        event.tags = { ...event.tags, slow_transaction: 'true' };
      }
      
      return event;
    },
  });

  // Initialize performance observer for Web Vitals
  initWebVitalsTracking();

  console.log('[Sentry] Initialized with performance monitoring');
}

/**
 * Track Web Vitals (LCP, FID, CLS, TTFB, INP)
 */
function initWebVitalsTracking(): void {
  if ('PerformanceObserver' in window) {
    // Track Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const lcp = lastEntry.startTime;
          if (lcp > SLOW_PAGE_LOAD_THRESHOLD) {
            addBreadcrumb({
              category: 'performance',
              message: `Slow LCP detected: ${Math.round(lcp)}ms`,
              level: 'warning',
              data: { lcp, threshold: SLOW_PAGE_LOAD_THRESHOLD },
            });
          }
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // LCP not supported
    }

    // Track Long Tasks (tasks > 50ms that block main thread)
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) {
            addBreadcrumb({
              category: 'performance',
              message: `Long task detected: ${Math.round(entry.duration)}ms`,
              level: 'warning',
              data: { duration: entry.duration, name: entry.name },
            });
          }
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      // Long tasks not supported
    }
  }
}

/**
 * Start a performance span for tracking custom operations
 */
export function startSpan<T>(
  name: string,
  operation: string,
  callback: () => T
): T {
  if (!isSentryEnabled || import.meta.env.DEV) {
    return callback();
  }

  return Sentry.startSpan(
    { name, op: operation },
    callback
  );
}

/**
 * Track an API call with performance metrics
 */
export async function trackApiCall<T>(
  name: string,
  apiCall: () => Promise<T>,
  metadata?: Record<string, string | number | boolean>
): Promise<T> {
  if (!isSentryEnabled || import.meta.env.DEV) {
    return apiCall();
  }

  const startTime = performance.now();
  
  return Sentry.startSpan(
    { 
      name, 
      op: 'http.client',
      attributes: metadata,
    },
    async (span) => {
      try {
        const result = await apiCall();
        const duration = performance.now() - startTime;
        
        if (duration > SLOW_API_CALL_THRESHOLD) {
          addBreadcrumb({
            category: 'api.slow',
            message: `Slow API call: ${name} took ${Math.round(duration)}ms`,
            level: 'warning',
            data: { duration, threshold: SLOW_API_CALL_THRESHOLD, ...metadata },
          });
          
          span?.setAttribute('slow_api_call', true);
        }
        
        span?.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: String(error) }); // ERROR
        throw error;
      }
    }
  );
}

/**
 * Track a page/route change for performance
 */
export function trackPageView(routeName: string, params?: Record<string, string>): void {
  if (!isSentryEnabled || import.meta.env.DEV) return;
  
  addBreadcrumb({
    category: 'navigation',
    message: `Page view: ${routeName}`,
    level: 'info',
    data: params,
  });
}

/**
 * Track a user interaction
 */
export function trackInteraction(
  action: string,
  element: string,
  metadata?: Record<string, unknown>
): void {
  if (!isSentryEnabled || import.meta.env.DEV) return;
  
  addBreadcrumb({
    category: 'ui.interaction',
    message: `${action}: ${element}`,
    level: 'info',
    data: metadata,
  });
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

/**
 * Create a React profiler wrapper for component performance tracking
 */
export function withProfiler<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.ComponentType<P> {
  if (!isSentryEnabled) {
    return Component;
  }
  return Sentry.withProfiler(Component, { name });
}

// Export Sentry for direct access when needed
export { Sentry };