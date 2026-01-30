import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * A component that intentionally throws an error when triggered.
 * Used for testing ErrorBoundary functionality.
 * 
 * IMPORTANT: This component should only be used in development!
 */

// Component that throws on render
const BrokenComponent = () => {
  throw new Error('Test error: This error was intentionally triggered to test the ErrorBoundary');
  return null;
};

export const ErrorTrigger = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    return <BrokenComponent />;
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setShouldError(true)}
      className="gap-2"
    >
      <AlertTriangle className="w-4 h-4" />
      Trigger Test Error
    </Button>
  );
};

export default ErrorTrigger;
