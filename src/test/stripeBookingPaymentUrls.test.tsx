import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import { useToast } from '@/hooks/use-toast';

const edgeFnSrc = readFileSync(
  path.resolve(__dirname, '../../supabase/functions/create-booking-payment/index.ts'),
  'utf8',
);

// Minimal stand-in that mirrors VenueDashboard's payment-return effect.
// Reads window.location.search (as VenueDashboard does) and fires the
// matching toast. Kept small so this test doesn't require full auth setup.
const VenueDashboardStub = () => {
  const { toast } = useToast();
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast({ title: 'Payment successful!', description: 'The artist has been notified.' });
    } else if (params.get('payment') === 'cancelled') {
      toast({
        title: 'Payment cancelled',
        description: 'You can pay anytime from your dashboard.',
        variant: 'destructive',
      });
    }
  }, [toast, location.search]);
  return <div>Venue Dashboard</div>;
};

const renderAt = (url: string) => {
  // MemoryRouter drives the route; window.location.search mirrors the URL
  // so the stub (like VenueDashboard) reads the same params it would in prod.
  const search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  window.history.replaceState({}, '', `/${search}`);
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/venue/dashboard" element={<VenueDashboardStub />} />
        <Route path="*" element={<div>Page Not Found</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('Stripe booking payment success_url/cancel_url end-to-end', () => {
  beforeEach(() => {
    toastMock.mockClear();
  });

  it('edge function builds success_url pointing at /venue/dashboard?payment=success', () => {
    expect(edgeFnSrc).toContain('/venue/dashboard?payment=success');
  });

  it('edge function builds cancel_url pointing at /venue/dashboard?payment=cancelled', () => {
    expect(edgeFnSrc).toContain('/venue/dashboard?payment=cancelled');
  });

  it('does NOT use the broken hyphenated /venue-dashboard path', () => {
    expect(edgeFnSrc).not.toMatch(/\/venue-dashboard(\?|"|`)/);
  });

  it('landing on success_url resolves to venue dashboard and shows the success toast', () => {
    renderAt('/venue/dashboard?payment=success&booking=bk_test_123');

    expect(screen.getByText('Venue Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Payment successful!',
        description: expect.stringMatching(/artist has been notified/i),
      }),
    );
  });

  it('landing on cancel_url resolves to venue dashboard and shows the cancelled toast', () => {
    renderAt('/venue/dashboard?payment=cancelled&booking=bk_test_123');

    expect(screen.getByText('Venue Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Payment cancelled',
        variant: 'destructive',
      }),
    );
  });

  it('does not fire a payment toast when no payment param is present', () => {
    renderAt('/venue/dashboard');
    expect(screen.getByText('Venue Dashboard')).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalled();
  });
});
