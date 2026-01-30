/**
 * Centralized Error Handler
 * Sanitizes database and API errors before displaying to users
 * Logs detailed errors for debugging while showing user-friendly messages
 * Includes retry logic for transient failures
 */

import { PostgrestError } from '@supabase/supabase-js';

export interface SanitizedError {
  userMessage: string;
  code: string;
  isRetryable: boolean;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// Error codes that are safe to retry
const RETRYABLE_CODES = ['PGRST301', 'PGRST504', '503', '429', 'ECONNRESET', 'NETWORK_ERROR', 'ETIMEDOUT', 'ENOTFOUND', 'ABORTED'];

// Map of Postgres/Supabase error codes to user-friendly messages
const ERROR_MAP: Record<string, string> = {
  // Authentication errors
  'PGRST301': 'Your session has expired. Please sign in again.',
  '401': 'You need to sign in to perform this action.',
  '403': 'You don\'t have permission to perform this action.',
  
  // Constraint violations
  '23505': 'This record already exists.',
  '23503': 'This action cannot be completed because it references data that doesn\'t exist.',
  '23514': 'The provided data doesn\'t meet the required criteria.',
  '23502': 'Required information is missing. Please fill in all required fields.',
  
  // RLS violations
  '42501': 'You don\'t have permission to access this data.',
  'PGRST204': 'You don\'t have permission to perform this action.',
  
  // Rate limiting
  '429': 'Too many requests. Please wait a moment and try again.',
  
  // Server errors
  '500': 'Something went wrong on our end. Please try again later.',
  '502': 'Service temporarily unavailable. Please try again.',
  '503': 'Service temporarily unavailable. Please try again.',
  '504': 'Request timed out. Please try again.',
  'PGRST504': 'Request timed out. Please try again.',
  
  // Connection errors
  'ECONNRESET': 'Connection lost. Please check your internet and try again.',
  'ENOTFOUND': 'Unable to connect. Please check your internet connection.',
  'ETIMEDOUT': 'Connection timed out. Please try again.',
  
  // Data errors
  '22P02': 'Invalid data format provided.',
  '22001': 'The provided text is too long.',
  '22003': 'The provided number is out of range.',
};

/**
 * Sanitizes a database or API error for user display
 * Logs the full error for debugging while returning a user-friendly message
 * Optionally tracks errors for production monitoring
 */
export function sanitizeError(
  error: unknown, 
  context?: string,
  options?: { track?: boolean }
): SanitizedError {
  // Log the full error for debugging (will be stripped in production by build tools)
  if (import.meta.env.DEV) {
    console.error(`[ErrorHandler${context ? ` - ${context}` : ''}]`, error);
  }

  // Handle null/undefined
  if (!error) {
    return {
      userMessage: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN',
      isRetryable: true,
    };
  }

  let result: SanitizedError;

  // Handle Supabase PostgrestError
  if (isPostgrestError(error)) {
    result = handlePostgrestError(error);
  }
  // Handle standard Error objects
  else if (error instanceof Error) {
    result = handleStandardError(error);
  }
  // Handle string errors
  else if (typeof error === 'string') {
    result = {
      userMessage: sanitizeMessage(error),
      code: 'STRING_ERROR',
      isRetryable: false,
    };
  }
  // Handle objects with message property
  else if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: string }).message;
    result = {
      userMessage: sanitizeMessage(msg),
      code: 'OBJECT_ERROR',
      isRetryable: false,
    };
  }
  // Fallback for unknown error types
  else {
    result = {
      userMessage: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN',
      isRetryable: true,
    };
  }

  // Track error if requested (default: true in production)
  if (options?.track !== false && !import.meta.env.DEV) {
    // Lazy import to avoid circular dependencies
    import('@/lib/errorTracking').then(({ trackError }) => {
      trackError(result.code, result.userMessage, {
        context,
        stackTrace: error instanceof Error ? error.stack : undefined,
        metadata: {
          originalError: typeof error === 'object' ? JSON.stringify(error) : String(error),
        },
      });
    }).catch(() => {
      // Silently fail if tracking fails
    });
  }

  return result;
}

/**
 * Type guard for PostgrestError
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Handles Supabase PostgrestError specifically
 */
function handlePostgrestError(error: PostgrestError): SanitizedError {
  const code = error.code || 'UNKNOWN';
  
  // Check for known error codes
  if (ERROR_MAP[code]) {
    return {
      userMessage: ERROR_MAP[code],
      code,
      isRetryable: RETRYABLE_CODES.includes(code),
    };
  }

  // Handle specific error patterns in the message
  const message = error.message.toLowerCase();
  
  if (message.includes('duplicate key') || message.includes('already exists')) {
    return {
      userMessage: 'This record already exists.',
      code: 'DUPLICATE',
      isRetryable: false,
    };
  }

  if (message.includes('violates row-level security')) {
    return {
      userMessage: 'You don\'t have permission to perform this action.',
      code: 'RLS_VIOLATION',
      isRetryable: false,
    };
  }

  if (message.includes('foreign key constraint')) {
    return {
      userMessage: 'This action cannot be completed because it references other data.',
      code: 'FK_VIOLATION',
      isRetryable: false,
    };
  }

  if (message.includes('not null constraint')) {
    return {
      userMessage: 'Required information is missing.',
      code: 'NULL_VIOLATION',
      isRetryable: false,
    };
  }

  // Default for unknown Postgrest errors
  return {
    userMessage: 'Unable to complete this action. Please try again.',
    code,
    isRetryable: true,
  };
}

/**
 * Handles standard JavaScript Error objects
 */
function handleStandardError(error: Error): SanitizedError {
  const message = error.message.toLowerCase();
  const name = error.name;

  // Network errors
  if (name === 'TypeError' && message.includes('fetch')) {
    return {
      userMessage: 'Unable to connect. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      isRetryable: true,
    };
  }

  // Abort errors (user cancelled or timeout)
  if (name === 'AbortError') {
    return {
      userMessage: 'Request was cancelled.',
      code: 'ABORTED',
      isRetryable: true,
    };
  }

  // Auth-specific errors from Supabase Auth
  if (message.includes('invalid login credentials')) {
    return {
      userMessage: 'Invalid email or password.',
      code: 'INVALID_CREDENTIALS',
      isRetryable: false,
    };
  }

  if (message.includes('email not confirmed')) {
    return {
      userMessage: 'Please verify your email before signing in.',
      code: 'EMAIL_NOT_CONFIRMED',
      isRetryable: false,
    };
  }

  if (message.includes('user already registered')) {
    return {
      userMessage: 'An account with this email already exists.',
      code: 'USER_EXISTS',
      isRetryable: false,
    };
  }

  if (message.includes('password')) {
    return {
      userMessage: 'Password does not meet requirements.',
      code: 'INVALID_PASSWORD',
      isRetryable: false,
    };
  }

  // Default - sanitize the message
  return {
    userMessage: sanitizeMessage(error.message),
    code: 'ERROR',
    isRetryable: false,
  };
}

/**
 * Removes potentially sensitive information from error messages
 */
function sanitizeMessage(message: string): string {
  // Patterns that might expose sensitive info
  const sensitivePatterns = [
    /table\s+["']?\w+["']?/gi,           // Table names
    /column\s+["']?\w+["']?/gi,          // Column names
    /relation\s+["']?\w+["']?/gi,        // Relation names
    /constraint\s+["']?\w+["']?/gi,      // Constraint names
    /function\s+["']?\w+["']?/gi,        // Function names
    /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, // UUIDs
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
    /https?:\/\/[^\s]+/gi,               // URLs
    /at\s+\/.+:\d+:\d+/g,                // Stack trace paths
  ];

  let sanitized = message;
  
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }

  // If the message is too technical or contains SQL, return generic message
  if (
    sanitized.includes('SELECT') ||
    sanitized.includes('INSERT') ||
    sanitized.includes('UPDATE') ||
    sanitized.includes('DELETE') ||
    sanitized.includes('pgsql') ||
    sanitized.includes('postgres')
  ) {
    return 'Unable to complete this action. Please try again.';
  }

  // Limit message length
  if (sanitized.length > 150) {
    return 'An error occurred. Please try again.';
  }

  return sanitized || 'An unexpected error occurred.';
}

/**
 * Helper to use with toast notifications
 */
export function getErrorToast(error: unknown, context?: string): { 
  title: string; 
  description: string; 
  variant: 'destructive' 
} {
  const sanitized = sanitizeError(error, context);
  return {
    title: 'Error',
    description: sanitized.userMessage,
    variant: 'destructive',
  };
}

/**
 * Helper for form validation errors
 */
export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages = Object.values(errors).flat();
  if (messages.length === 0) return 'Please check your input.';
  if (messages.length === 1) return messages[0];
  return `Please fix the following: ${messages.slice(0, 3).join(', ')}${messages.length > 3 ? '...' : ''}`;
}

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateBackoffDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an async operation with automatic retry for transient failures
 * Uses exponential backoff with jitter
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: RetryConfig,
  context?: string
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const sanitized = sanitizeError(error, context);

      // Don't retry if error is not retryable
      if (!sanitized.isRetryable) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= finalConfig.maxRetries) {
        if (import.meta.env.DEV) {
          console.error(`[Retry${context ? ` - ${context}` : ''}] All ${finalConfig.maxRetries} retries exhausted`);
        }
        throw error;
      }

      // Calculate delay and wait before retrying
      const delay = calculateBackoffDelay(attempt, finalConfig);
      if (import.meta.env.DEV) {
        console.log(`[Retry${context ? ` - ${context}` : ''}] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      }
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const sanitized = sanitizeError(error);
  return sanitized.isRetryable;
}

/**
 * Get retry configuration for specific error types
 */
export function getRetryConfigForError(error: unknown): RetryConfig {
  const sanitized = sanitizeError(error);
  
  // Rate limiting - use longer delays
  if (sanitized.code === '429') {
    return {
      maxRetries: 5,
      baseDelayMs: 5000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };
  }
  
  // Network errors - quick retries
  if (sanitized.code === 'NETWORK_ERROR' || sanitized.code === 'ECONNRESET') {
    return {
      maxRetries: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
    };
  }
  
  // Timeouts - moderate delays
  if (sanitized.code === 'PGRST504' || sanitized.code === 'ETIMEDOUT') {
    return {
      maxRetries: 2,
      baseDelayMs: 2000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    };
  }
  
  return DEFAULT_RETRY_CONFIG;
}

/**
 * Test utilities for simulating errors and retry behavior
 * Call from browser console: window.testRetry.networkError() or window.testRetry.rateLimitError()
 */
export const retryTestUtils = {
  /**
   * Simulate a network failure that succeeds after N attempts
   */
  async networkError(successOnAttempt: number = 3): Promise<string> {
    let attempt = 0;
    
    console.log(`[RetryTest] Simulating network error that succeeds on attempt ${successOnAttempt}`);
    
    const result = await withRetry(
      async () => {
        attempt++;
        console.log(`[RetryTest] Attempt ${attempt}...`);
        
        if (attempt < successOnAttempt) {
          const error = new TypeError('Failed to fetch');
          error.name = 'TypeError';
          throw error;
        }
        
        return `Success on attempt ${attempt}!`;
      },
      { maxRetries: 5, baseDelayMs: 500 },
      'NetworkTest'
    );
    
    console.log(`[RetryTest] ${result}`);
    return result;
  },

  /**
   * Simulate a rate limit error (429) that succeeds after N attempts
   */
  async rateLimitError(successOnAttempt: number = 2): Promise<string> {
    let attempt = 0;
    
    console.log(`[RetryTest] Simulating rate limit (429) that succeeds on attempt ${successOnAttempt}`);
    
    const result = await withRetry(
      async () => {
        attempt++;
        console.log(`[RetryTest] Attempt ${attempt}...`);
        
        if (attempt < successOnAttempt) {
          throw { code: '429', message: 'Too many requests' };
        }
        
        return `Success on attempt ${attempt}!`;
      },
      getRetryConfigForError({ code: '429', message: 'Too many requests' }),
      'RateLimitTest'
    );
    
    console.log(`[RetryTest] ${result}`);
    return result;
  },

  /**
   * Simulate a timeout error
   */
  async timeoutError(successOnAttempt: number = 2): Promise<string> {
    let attempt = 0;
    
    console.log(`[RetryTest] Simulating timeout that succeeds on attempt ${successOnAttempt}`);
    
    const result = await withRetry(
      async () => {
        attempt++;
        console.log(`[RetryTest] Attempt ${attempt}...`);
        
        if (attempt < successOnAttempt) {
          throw { code: 'PGRST504', message: 'Request timed out' };
        }
        
        return `Success on attempt ${attempt}!`;
      },
      getRetryConfigForError({ code: 'PGRST504', message: 'Timeout' }),
      'TimeoutTest'
    );
    
    console.log(`[RetryTest] ${result}`);
    return result;
  },

  /**
   * Simulate a non-retryable error (should fail immediately)
   */
  async nonRetryableError(): Promise<never> {
    console.log(`[RetryTest] Simulating non-retryable auth error`);
    
    await withRetry(
      async () => {
        throw new Error('Invalid login credentials');
      },
      { maxRetries: 5 },
      'AuthTest'
    );
    
    throw new Error('Should not reach here');
  },

  /**
   * Simulate exhausting all retries
   */
  async exhaustRetries(): Promise<never> {
    console.log(`[RetryTest] Simulating exhausted retries (will fail after all attempts)`);
    
    await withRetry(
      async () => {
        throw new TypeError('Failed to fetch');
      },
      { maxRetries: 3, baseDelayMs: 300 },
      'ExhaustTest'
    );
    
    throw new Error('Should not reach here');
  },
};

// Expose test utilities globally for console access
if (typeof window !== 'undefined') {
  (window as unknown as { testRetry: typeof retryTestUtils }).testRetry = retryTestUtils;
}
