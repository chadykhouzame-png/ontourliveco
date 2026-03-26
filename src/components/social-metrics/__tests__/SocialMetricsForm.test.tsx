import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SocialMetricsForm from '../../SocialMetricsForm';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: (...args: any[]) => {
        mockSelect(table, ...args);
        return {
          eq: (_col: string, _val: string) => Promise.resolve({ data: [], error: null }),
        };
      },
      insert: (row: any) => {
        mockInsert(table, row);
        return Promise.resolve({ error: null });
      },
      update: (row: any) => {
        mockUpdate(table, row);
        return {
          eq: () => Promise.resolve({ error: null }),
        };
      },
      delete: () => {
        mockDelete(table);
        return {
          in: () => Promise.resolve({ error: null }),
        };
      },
    }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('SocialMetricsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state then form', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Social Media Metrics')).toBeInTheDocument();
    });
  });

  it('shows add platform buttons when no platforms exist', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
      expect(screen.getByText('Instagram')).toBeInTheDocument();
      expect(screen.getByText('TikTok')).toBeInTheDocument();
      expect(screen.getByText('SoundCloud')).toBeInTheDocument();
    });
  });

  it('adds a platform card when add button is clicked', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));

    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('removes add button for already added platform', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));

    // The "add Spotify" button should be gone; Spotify now appears as a card header
    const addButtons = screen.getAllByRole('button');
    const spotifyAddBtn = addButtons.find(
      btn => btn.textContent?.includes('Spotify') && btn.textContent?.includes('+')
    );
    expect(spotifyAddBtn).toBeUndefined();
  });

  it('shows confirmation dialog when removing a platform', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    fireEvent.click(screen.getByLabelText('Remove Spotify'));

    expect(screen.getByText('Remove platform?')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove Spotify/)).toBeInTheDocument();
  });

  it('removes platform after confirming dialog', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove Spotify'));
    fireEvent.click(screen.getByText('Remove'));

    expect(screen.queryByPlaceholderText('@username')).not.toBeInTheDocument();
  });

  it('keeps platform when cancel is clicked in dialog', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    fireEvent.click(screen.getByLabelText('Remove Spotify'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();
  });

  it('calls supabase insert on save for new platforms', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        'social_connections',
        expect.objectContaining({
          artist_id: 'artist-123',
          platform: 'spotify',
          is_connected: true,
        })
      );
    });
  });

  it('can add multiple platforms', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    fireEvent.click(screen.getByText('Instagram'));

    const usernameInputs = screen.getAllByPlaceholderText('@username');
    expect(usernameInputs).toHaveLength(2);
  });

  it('renders save button', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Save Social Metrics')).toBeInTheDocument();
    });
  });
});
