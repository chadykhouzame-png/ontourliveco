import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'success' | 'warning' | 'error' | 'info';

interface BannerConfig {
  variant: Variant;
  title: string;
  description: string;
  cleanupKeys: string[];
}

// Reads query params set by Stripe redirects and renders a visible, dismissible
// confirmation banner. Cleans matching params from the URL on dismiss / unmount
// so a page refresh doesn't re-trigger the banner.
type Mode = 'venue' | 'artist';

const buildConfig = (mode: Mode, params: URLSearchParams): BannerConfig | null => {
  if (mode === 'venue') {
    const payment = params.get('payment');
    const bookingId = params.get('booking');
    const bookingSuffix = bookingId ? ` (booking ${bookingId.slice(0, 8)}…)` : '';
    if (payment === 'success') {
      return {
        variant: 'success',
        title: 'Payment successful',
        description: `Your payment cleared and the artist has been notified${bookingSuffix}.`,
        cleanupKeys: ['payment', 'booking'],
      };
    }
    if (payment === 'cancelled' || payment === 'canceled') {
      return {
        variant: 'warning',
        title: 'Payment cancelled',
        description: `No charge was made${bookingSuffix}. You can retry payment anytime from the booking below.`,
        cleanupKeys: ['payment', 'booking'],
      };
    }
    if (payment === 'failed') {
      return {
        variant: 'error',
        title: 'Payment failed',
        description: `Stripe rejected the charge${bookingSuffix}. Please try a different card or contact support.`,
        cleanupKeys: ['payment', 'booking'],
      };
    }
    return null;
  }

  // artist mode
  const stripe = params.get('stripe');
  if (stripe === 'complete') {
    return {
      variant: 'success',
      title: 'Stripe onboarding submitted',
      description:
        "Great — we're verifying with Stripe. Payouts will unlock as soon as the account.updated webhook lands.",
      cleanupKeys: ['stripe'],
    };
  }
  if (stripe === 'refresh') {
    return {
      variant: 'warning',
      title: 'Stripe setup incomplete',
      description:
        'Your onboarding session expired or was closed before finishing. Click "Continue in Stripe" below to pick up where you left off.',
      cleanupKeys: ['stripe'],
    };
  }
  if (stripe === 'error') {
    return {
      variant: 'error',
      title: "Couldn't reach Stripe",
      description: 'Something went wrong while starting onboarding. Please try again in a moment.',
      cleanupKeys: ['stripe'],
    };
  }
  return null;
};

const variantStyles: Record<Variant, { wrap: string; icon: JSX.Element; title: string }> = {
  success: {
    wrap: 'bg-success/10 border-success/30 text-success dark:text-success',
    icon: <CheckCircle2 className="w-5 h-5 text-success shrink-0" aria-hidden />,
    title: 'text-success dark:text-success',
  },
  warning: {
    wrap: 'bg-warning/10 border-warning/30 text-warning dark:text-warning',
    icon: <AlertTriangle className="w-5 h-5 text-warning shrink-0" aria-hidden />,
    title: 'text-warning dark:text-warning',
  },
  error: {
    wrap: 'bg-danger/10 border-danger/30 text-danger dark:text-danger',
    icon: <XCircle className="w-5 h-5 text-danger shrink-0" aria-hidden />,
    title: 'text-danger dark:text-danger',
  },
  info: {
    wrap: 'bg-info/10 border-info/30 text-info dark:text-info',
    icon: <Loader2 className="w-5 h-5 text-info shrink-0 animate-spin" aria-hidden />,
    title: 'text-info dark:text-info',
  },
};

interface Props {
  mode: Mode;
}

export const StripeReturnBanner = ({ mode }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const config = useMemo(() => buildConfig(mode, params), [mode, params]);

  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed flag when a new outcome arrives
  useEffect(() => {
    setDismissed(false);
  }, [config?.title]);

  if (!config || dismissed) return null;

  const clearParams = () => {
    const next = new URLSearchParams(location.search);
    config.cleanupKeys.forEach((k) => next.delete(k));
    const search = next.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash },
      { replace: true },
    );
    setDismissed(true);
  };

  const styles = variantStyles[config.variant];

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={`stripe-return-banner-${config.variant}`}
      className={cn(
        'rounded-2xl border px-4 py-3 flex items-start gap-3 shadow-sm',
        styles.wrap,
      )}
    >
      {styles.icon}
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold', styles.title)}>{config.title}</p>
        <p className="text-sm text-foreground/80 mt-0.5">{config.description}</p>
      </div>
      <button
        type="button"
        onClick={clearParams}
        aria-label="Dismiss"
        className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default StripeReturnBanner;
