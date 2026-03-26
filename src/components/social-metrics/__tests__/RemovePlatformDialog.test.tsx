import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RemovePlatformDialog from '../RemovePlatformDialog';
import { emptyMetrics } from '../types';

describe('RemovePlatformDialog', () => {
  const platforms = [emptyMetrics('spotify'), emptyMetrics('instagram')];

  it('does not render dialog content when removeIndex is null', () => {
    render(<RemovePlatformDialog removeIndex={null} platforms={platforms} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Remove platform?')).not.toBeInTheDocument();
  });

  it('shows dialog with platform name when removeIndex is set', () => {
    render(<RemovePlatformDialog removeIndex={0} platforms={platforms} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Remove platform?')).toBeInTheDocument();
    expect(screen.getByText(/Spotify/)).toBeInTheDocument();
  });

  it('calls onConfirm when Remove button is clicked', () => {
    const onConfirm = vi.fn();
    render(<RemovePlatformDialog removeIndex={1} platforms={platforms} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Remove'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<RemovePlatformDialog removeIndex={0} platforms={platforms} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
