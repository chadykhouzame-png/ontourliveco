import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AddPlatformButtons from '../AddPlatformButtons';

describe('AddPlatformButtons', () => {
  it('renders nothing when no platforms available', () => {
    const { container } = render(<AddPlatformButtons availablePlatforms={[]} onAdd={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders buttons for available platforms', () => {
    render(<AddPlatformButtons availablePlatforms={['spotify', 'tiktok']} onAdd={vi.fn()} />);
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('TikTok')).toBeInTheDocument();
  });

  it('calls onAdd with platform when clicked', () => {
    const onAdd = vi.fn();
    render(<AddPlatformButtons availablePlatforms={['instagram']} onAdd={onAdd} />);
    fireEvent.click(screen.getByText('Instagram'));
    expect(onAdd).toHaveBeenCalledWith('instagram');
  });
});
