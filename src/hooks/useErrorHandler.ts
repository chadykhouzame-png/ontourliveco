/**
 * Hook for consistent error handling with toast notifications
 * Sanitizes database errors before displaying to users
 */

import { useToast } from '@/hooks/use-toast';
import { sanitizeError, getErrorToast } from '@/lib/errorHandler';

export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Shows a sanitized error toast
   * @param error - The error object (can be any type)
   * @param context - Optional context for logging (e.g., "creating booking")
   */
  const showError = (error: unknown, context?: string) => {
    const errorToast = getErrorToast(error, context);
    toast(errorToast);
  };

  /**
   * Shows a sanitized error toast with a custom title
   * @param error - The error object
   * @param title - Custom title for the toast
   * @param context - Optional context for logging
   */
  const showErrorWithTitle = (error: unknown, title: string, context?: string) => {
    const sanitized = sanitizeError(error, context);
    toast({
      title,
      description: sanitized.userMessage,
      variant: 'destructive',
    });
  };

  /**
   * Gets sanitized error message without showing toast
   * Useful when you need the message for custom handling
   */
  const getSanitizedMessage = (error: unknown, context?: string) => {
    return sanitizeError(error, context);
  };

  return {
    showError,
    showErrorWithTitle,
    getSanitizedMessage,
  };
}
