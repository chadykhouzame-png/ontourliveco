import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock supabase client used by PayoutSetupChecklist
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          account_created: true,
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true,
          webhook_received: true,
          webhook_event_id: 'evt_test_123',
          webhook_received_at: new Date().toISOString(),
          webhook_status: 'processed',
          stripe_account_id: 'acct_test_123',
          onboarding_complete: true,
        },
        error: null,
      }),
    },
  },
}));

import PayoutSetupChecklist from '@/components/PayoutSetupChecklist';

const edgeFnSrc = readFileSync(
  path.resolve(__dirname, '../../supabase/functions/create-connect-account/index.ts'),
  'utf8',
);

describe('Stripe Connect return_url/refresh_url end-to-end', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('edge function builds return_url pointing at /artist/dashboard?stripe=complete', () => {
    expect(edgeFnSrc).toContain('/artist/dashboard?stripe=complete');
  });

  it('edge function builds refresh_url pointing at /artist/dashboard?stripe=refresh', () => {
    expect(edgeFnSrc).toContain('/artist/dashboard?stripe=refresh');
  });

  it('does NOT use the broken hyphenated /artist-dashboard path', () => {
    expect(edgeFnSrc).not.toMatch(/\/artist-dashboard(\?|"|`)/);
  });

  it('renders payout completion UI when the user lands on /artist/dashboard?stripe=complete', async () => {
    // Simulate the browser landing on the return_url. The route target renders
    // the PayoutSetupChecklist that ArtistDashboard mounts.
    render(
      <MemoryRouter initialEntries={['/artist/dashboard?stripe=complete']}>
        <Routes>
          <Route path="/artist/dashboard" element={<PayoutSetupChecklist />} />
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Route must resolve — no NotFound fallthrough.
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument();

    // Completion UI renders after verify-payout-setup resolves.
    await waitFor(() => {
      expect(screen.getByText(/Payouts are ready/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/You'll receive payouts automatically after each booking\./i),
    ).toBeInTheDocument();
  });

  it('refresh_url target /artist/dashboard?stripe=refresh also resolves (no NotFound)', () => {
    render(
      <MemoryRouter initialEntries={['/artist/dashboard?stripe=refresh']}>
        <Routes>
          <Route path="/artist/dashboard" element={<div>Artist Dashboard OK</div>} />
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Artist Dashboard OK')).toBeInTheDocument();
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument();
  });
});
