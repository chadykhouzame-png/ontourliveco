import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';

// Mirror of the LegacyRedirect helper in AnimatedRoutes.tsx.
// Kept in-file so the test doesn't have to mount the full app (auth, providers).
const LegacyRedirect = ({ to }: { to: string }) => {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
};

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="probe">{pathname + search}</div>;
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/artist-dashboard" element={<LegacyRedirect to="/artist/dashboard" />} />
        <Route path="/venue-dashboard" element={<LegacyRedirect to="/venue/dashboard" />} />
        <Route path="/artist/dashboard" element={<LocationProbe />} />
        <Route path="/venue/dashboard" element={<LocationProbe />} />
        <Route path="*" element={<div>Page Not Found</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('Legacy hyphenated dashboard redirects', () => {
  it('/artist-dashboard redirects to /artist/dashboard', () => {
    renderAt('/artist-dashboard');
    expect(screen.getByTestId('probe').textContent).toBe('/artist/dashboard');
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument();
  });

  it('/venue-dashboard redirects to /venue/dashboard', () => {
    renderAt('/venue-dashboard');
    expect(screen.getByTestId('probe').textContent).toBe('/venue/dashboard');
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument();
  });

  it('preserves Stripe query params on /artist-dashboard?stripe=complete', () => {
    renderAt('/artist-dashboard?stripe=complete');
    expect(screen.getByTestId('probe').textContent).toBe('/artist/dashboard?stripe=complete');
  });

  it('preserves Stripe query params on /venue-dashboard?payment=success&booking=bk_1', () => {
    renderAt('/venue-dashboard?payment=success&booking=bk_1');
    expect(screen.getByTestId('probe').textContent).toBe(
      '/venue/dashboard?payment=success&booking=bk_1',
    );
  });
});
