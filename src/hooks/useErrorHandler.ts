/**
 * Hook for consistent error handling with toast notifications
 * Sanitizes database errors before displaying to users
 * Includes retry logic for transient failures
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  sanitizeError, 
  getErrorToast, 
  withRetry, 
  isRetryableError,
  getRetryConfigForError,
  type RetryConfig 
} from '@/lib/errorHandler';

export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Shows a sanitized error toast
   * @param error - The error object (can be any type)
   * @param context - Optional context for logging (e.g., "creating booking")
   */
  const showError = useCallback((error: unknown, context?: string) => {
    const errorToast = getErrorToast(error, context);
    toast(errorToast);
  }, [toast]);

  /**
   * Shows a sanitized error toast with a custom title
   * @param error - The error object
   * @param title - Custom title for the toast
   * @param context - Optional context for logging
   */
  const showErrorWithTitle = useCallback((error: unknown, title: string, context?: string) => {
    const sanitized = sanitizeError(error, context);
    toast({
      title,
      description: sanitized.userMessage,
      variant: 'destructive',
    });
  }, [toast]);

  /**
   * Gets sanitized error message without showing toast
   * Useful when you need the message for custom handling
   */
  const getSanitizedMessage = useCallback((error: unknown, context?: string) => {
    return sanitizeError(error, context);
  }, []);

  /**
   * Execute an operation with automatic retry for transient failures
   * Shows error toast only after all retries are exhausted
   * @param operation - Async function to execute
   * @param context - Context for logging
   * @param config - Optional retry configuration
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string,
    config?: RetryConfig
  ): Promise<T> => {
    try {
      return await withRetry(operation, config, context);
    } catch (error) {
      showError(error, context);
      throw error;
    }
  }, [showError]);

  /**
   * Execute an operation with automatic retry, using error-specific retry config
   * @param operation - Async function to execute
   * @param context - Context for logging
   */
  const executeWithSmartRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    try {
      // First attempt to detect error type for config
      return await operation();
    } catch (firstError) {
      if (!isRetryableError(firstError)) {
        showError(firstError, context);
        throw firstError;
      }

      // Get error-specific retry config and retry
      const config = getRetryConfigForError(firstError);
      try {
        return await withRetry(operation, config, context);
      } catch (finalError) {
        showError(finalError, context);
        throw finalError;
      }
    }
  }, [showError]);

  /**
   * Check if an error can be retried
   */
  const canRetry = useCallback((error: unknown): boolean => {
    return isRetryableError(error);
  }, []);

  return {
    showError,
    showErrorWithTitle,
    getSanitizedMessage,
    executeWithRetry,
    executeWithSmartRetry,
    canRetry,
  };
}
