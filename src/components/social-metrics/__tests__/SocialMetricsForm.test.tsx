import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SocialMetricsForm from '../../SocialMetricsForm';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteFn = vi.fn();
const mockIn = vi.fn();

// Track what the select eq call should return per-call
let selectCallCount = 0;
let selectReturnData: any[][] = [[]];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: (...args: any[]) => {
        mockSelect(table, ...args);
        const callIdx = selectCallCount++;
        const data = selectReturnData[callIdx] ?? [];
        return {
          eq: (_col: string, _val: string) => Promise.resolve({ data, error: null }),
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
        mockDeleteFn(table);
        return {
          in: (_col: string, ids: string[]) => {
            mockIn(table, ids);
            return Promise.resolve({ error: null });
          },
        };
      },
    }),
  },
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('SocialMetricsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectReturnData = [[]];
    mockToast.mockClear();
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

describe('SocialMetricsForm - pre-existing platforms', () => {
  const existingPlatforms = [
    {
      id: 'existing-1',
      platform: 'spotify',
      platform_username: 'dj_existing',
      profile_url: 'https://open.spotify.com/artist/123',
      follower_count: 5000,
      likes_count: null,
      comments_count: null,
      shares_count: null,
      engagement_rate: null,
      avg_likes_per_post: null,
      avg_comments_per_post: null,
      is_connected: true,
    },
    {
      id: 'existing-2',
      platform: 'instagram',
      platform_username: 'dj_insta',
      profile_url: 'https://instagram.com/dj_insta',
      follower_count: 12000,
      likes_count: 300,
      comments_count: 50,
      shares_count: null,
      engagement_rate: '4.5',
      avg_likes_per_post: 150,
      avg_comments_per_post: 20,
      is_connected: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    // First select (initial load) returns existing data
    // Second select (save flow re-fetch) returns existing data
    selectReturnData = [existingPlatforms, existingPlatforms];
  });

  it('loads and displays pre-existing platforms', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('dj_existing')).toBeInTheDocument();
      expect(screen.getByDisplayValue('dj_insta')).toBeInTheDocument();
    });
  });

  it('hides add buttons for already loaded platforms', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('dj_existing')).toBeInTheDocument();
    });
    // Spotify and Instagram are loaded, so only TikTok and SoundCloud add buttons remain
    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('SoundCloud')).toBeInTheDocument();
    // Spotify/Instagram should not appear as add buttons (they're card headers now)
    const allButtons = screen.getAllByRole('button');
    const spotifyAdd = allButtons.find(b => b.textContent?.includes('Spotify') && !b.getAttribute('aria-label'));
    expect(spotifyAdd).toBeUndefined();
  });

  it('calls update (not insert) when saving existing platforms', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('dj_existing')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledWith(
        'social_connections',
        expect.objectContaining({
          artist_id: 'artist-123',
          platform: 'spotify',
          platform_username: 'dj_existing',
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        'social_connections',
        expect.objectContaining({
          artist_id: 'artist-123',
          platform: 'instagram',
          platform_username: 'dj_insta',
        })
      );
      // Should not insert since both have IDs
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it('deletes removed platform and updates remaining on save', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('dj_existing')).toBeInTheDocument();
    });

    // Remove Spotify
    fireEvent.click(screen.getByLabelText('Remove Spotify'));
    fireEvent.click(screen.getByText('Remove'));

    // Only Instagram should remain
    expect(screen.queryByDisplayValue('dj_existing')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('dj_insta')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      // Should delete the removed spotify record
      expect(mockIn).toHaveBeenCalledWith('social_connections', ['existing-1']);
      // Should update the remaining instagram record
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        'social_connections',
        expect.objectContaining({
          platform: 'instagram',
          platform_username: 'dj_insta',
        })
      );
    });
  });

  it('mixes update for existing and insert for new platforms on save', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('dj_existing')).toBeInTheDocument();
    });

    // Add TikTok as a new platform
    fireEvent.click(screen.getByText('TikTok'));

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      // 2 updates for existing platforms
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      // 1 insert for the new TikTok platform
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith(
        'social_connections',
        expect.objectContaining({
          artist_id: 'artist-123',
          platform: 'tiktok',
        })
      );
    });
  });

  it('deletes all platforms when all are removed before save', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('dj_existing')).toBeInTheDocument();
    });

    // Remove Spotify
    fireEvent.click(screen.getByLabelText('Remove Spotify'));
    fireEvent.click(screen.getByText('Remove'));

    // Remove Instagram
    fireEvent.click(screen.getByLabelText('Remove Instagram'));
    fireEvent.click(screen.getByText('Remove'));

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockIn).toHaveBeenCalledWith(
        'social_connections',
        expect.arrayContaining(['existing-1', 'existing-2'])
      );
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('SocialMetricsForm - validation errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectReturnData = [[]];
    mockToast.mockClear();
  });

  it('shows validation error for username exceeding 100 chars', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    const usernameInput = screen.getByPlaceholderText('@username');
    fireEvent.change(usernameInput, { target: { value: 'a'.repeat(101) } });

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: expect.stringContaining('Spotify'),
        })
      );
      // Should NOT call insert since validation failed
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it('shows validation error for invalid URL format', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    const urlInput = screen.getByPlaceholderText('https://...');
    fireEvent.change(urlInput, { target: { value: 'ftp://invalid-protocol.com' } });

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: expect.stringContaining('Spotify'),
        })
      );
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it('allows valid http and https URLs', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Spotify'));
    const urlInput = screen.getByPlaceholderText('https://...');
    fireEvent.change(urlInput, { target: { value: 'https://open.spotify.com/artist/123' } });

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
      // Toast should not be called with destructive variant
      const destructiveCalls = mockToast.mock.calls.filter(
        (call: any[]) => call[0]?.variant === 'destructive'
      );
      expect(destructiveCalls).toHaveLength(0);
    });
  });

  it('allows empty optional fields without validation error', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    // Add platform but leave all fields empty (defaults)
    fireEvent.click(screen.getByText('Spotify'));
    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
      const destructiveCalls = mockToast.mock.calls.filter(
        (call: any[]) => call[0]?.variant === 'destructive'
      );
      expect(destructiveCalls).toHaveLength(0);
    });
  });

  it('blocks save when any platform has invalid data', async () => {
    render(<SocialMetricsForm artistId="artist-123" />);
    await waitFor(() => {
      expect(screen.getByText('Spotify')).toBeInTheDocument();
    });

    // Add two platforms
    fireEvent.click(screen.getByText('Spotify'));
    fireEvent.click(screen.getByText('Instagram'));

    // Make Instagram invalid with bad URL
    const urlInputs = screen.getAllByPlaceholderText('https://...');
    fireEvent.change(urlInputs[1], { target: { value: 'not-a-url' } });

    fireEvent.click(screen.getByText('Save Social Metrics'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: expect.stringContaining('Instagram'),
        })
      );
      // Neither platform should be saved
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
});
