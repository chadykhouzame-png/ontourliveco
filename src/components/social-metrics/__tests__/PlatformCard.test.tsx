import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlatformCard from '../PlatformCard';
import { emptyMetrics } from '../types';

describe('PlatformCard', () => {
  const defaultProps = {
    platform: { ...emptyMetrics('spotify'), platform_username: 'dj_test' },
    index: 0,
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
  };

  it('renders platform name and username input', () => {
    render(<PlatformCard {...defaultProps} />);
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByDisplayValue('dj_test')).toBeInTheDocument();
  });

  it('calls onRemove with index when trash button clicked', () => {
    render(<PlatformCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Remove Spotify'));
    expect(defaultProps.onRemove).toHaveBeenCalledWith(0);
  });

  it('calls onUpdate when username changes', () => {
    render(<PlatformCard {...defaultProps} />);
    const input = screen.getByDisplayValue('dj_test');
    fireEvent.change(input, { target: { value: 'new_user' } });
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(0, 'platform_username', 'new_user');
  });

  it('renders all metric input fields', () => {
    render(<PlatformCard {...defaultProps} />);
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('Total Likes')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Shares')).toBeInTheDocument();
    expect(screen.getByText('Eng. Rate %')).toBeInTheDocument();
    expect(screen.getByText('Avg Likes/Post')).toBeInTheDocument();
    expect(screen.getByText('Avg Comments/Post')).toBeInTheDocument();
  });
});
