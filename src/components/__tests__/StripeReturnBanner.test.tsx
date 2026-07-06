import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import StripeReturnBanner from '@/components/StripeReturnBanner';

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="loc">{pathname + search}</div>;
};

const renderBanner = (mode: 'venue' | 'artist', url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <StripeReturnBanner mode={mode} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('StripeReturnBanner — venue', () => {
  it('shows a success banner for ?payment=success and mentions the booking', () => {
    renderBanner('venue', '/venue/dashboard?payment=success&booking=bk_abcdef1234');
    expect(screen.getByTestId('stripe-return-banner-success')).toBeInTheDocument();
    expect(screen.getByText(/Payment successful/i)).toBeInTheDocument();
    expect(screen.getByText(/artist has been notified/i)).toBeInTheDocument();
    expect(screen.getByText(/booking bk_abcde/i)).toBeInTheDocument();
  });

  it('shows a warning banner for ?payment=cancelled', () => {
    renderBanner('venue', '/venue/dashboard?payment=cancelled&booking=bk_1');
    expect(screen.getByTestId('stripe-return-banner-warning')).toBeInTheDocument();
    expect(screen.getByText(/Payment cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/No charge was made/i)).toBeInTheDocument();
  });

  it('accepts the American spelling ?payment=canceled', () => {
    renderBanner('venue', '/venue/dashboard?payment=canceled');
    expect(screen.getByTestId('stripe-return-banner-warning')).toBeInTheDocument();
  });

  it('shows an error banner for ?payment=failed', () => {
    renderBanner('venue', '/venue/dashboard?payment=failed');
    expect(screen.getByTestId('stripe-return-banner-error')).toBeInTheDocument();
    expect(screen.getByText(/Payment failed/i)).toBeInTheDocument();
  });

  it('renders nothing when no payment param is present', () => {
    renderBanner('venue', '/venue/dashboard');
    expect(screen.queryByTestId(/stripe-return-banner/)).not.toBeInTheDocument();
  });

  it('dismiss button strips payment/booking params from the URL', () => {
    renderBanner('venue', '/venue/dashboard?payment=success&booking=bk_1&tab=history');
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByTestId(/stripe-return-banner/)).not.toBeInTheDocument();
    // Unrelated params (?tab=history) are preserved.
    expect(screen.getByTestId('loc').textContent).toBe('/venue/dashboard?tab=history');
  });
});

describe('StripeReturnBanner — artist', () => {
  it('shows a success banner for ?stripe=complete', () => {
    renderBanner('artist', '/artist/dashboard?stripe=complete');
    expect(screen.getByTestId('stripe-return-banner-success')).toBeInTheDocument();
    expect(screen.getByText(/Stripe onboarding submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/account\.updated webhook/i)).toBeInTheDocument();
  });

  it('shows a warning banner for ?stripe=refresh', () => {
    renderBanner('artist', '/artist/dashboard?stripe=refresh');
    expect(screen.getByTestId('stripe-return-banner-warning')).toBeInTheDocument();
    expect(screen.getByText(/Stripe setup incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue in Stripe/i)).toBeInTheDocument();
  });

  it('shows an error banner for ?stripe=error', () => {
    renderBanner('artist', '/artist/dashboard?stripe=error');
    expect(screen.getByTestId('stripe-return-banner-error')).toBeInTheDocument();
    expect(screen.getByText(/Couldn't reach Stripe/i)).toBeInTheDocument();
  });

  it('ignores venue-only ?payment=success param in artist mode', () => {
    renderBanner('artist', '/artist/dashboard?payment=success');
    expect(screen.queryByTestId(/stripe-return-banner/)).not.toBeInTheDocument();
  });

  it('dismiss button strips only the stripe param', () => {
    renderBanner('artist', '/artist/dashboard?stripe=complete&ref=email');
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByTestId(/stripe-return-banner/)).not.toBeInTheDocument();
    expect(screen.getByTestId('loc').textContent).toBe('/artist/dashboard?ref=email');
  });
});
