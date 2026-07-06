/**
 * Focused regression tests for two behaviors:
 *   1. Explicit theme preferences persist in localStorage across renders/remounts.
 *   2. When no (or an invalid) preference is stored, the app falls back to the
 *      OS "prefers-color-scheme" setting and keeps tracking it.
 *
 * These complement `themeProvider.test.tsx` (which also covers menu wiring)
 * by isolating the storage + system-fallback contract.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

const STORAGE_KEY = "otl.theme";

function Probe() {
  const { theme, preference, setPreference, clearPreference } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="preference">{preference}</span>
      <button data-testid="to-light" onClick={() => setPreference("light")} />
      <button data-testid="to-dark" onClick={() => setPreference("dark")} />
      <button data-testid="to-system" onClick={() => setPreference("system")} />
      <button data-testid="clear" onClick={clearPreference} />
    </div>
  );
}

interface MockMediaOptions {
  prefersDark: boolean;
  onListener?: (cb: (e: MediaQueryListEvent) => void) => void;
  onRemove?: () => void;
}

function stubMatchMedia({ prefersDark, onListener, onRemove }: MockMediaOptions) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      addEventListener: vi.fn((_evt: string, cb: (e: MediaQueryListEvent) => void) => {
        onListener?.(cb);
      }),
      removeEventListener: vi.fn(() => onRemove?.()),
      dispatchEvent: vi.fn(),
    }))
  );
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.style.removeProperty("colorScheme");
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("Theme preference persistence", () => {
  it("writes 'light' to localStorage when the user picks light", () => {
    stubMatchMedia({ prefersDark: true });
    renderProvider();

    act(() => {
      screen.getByTestId("to-light").click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("writes 'dark' to localStorage when the user picks dark", () => {
    stubMatchMedia({ prefersDark: false });
    renderProvider();

    act(() => {
      screen.getByTestId("to-dark").click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("writes 'system' to localStorage when the user explicitly picks system", () => {
    stubMatchMedia({ prefersDark: true });
    renderProvider();

    act(() => {
      screen.getByTestId("to-system").click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe("system");
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("survives a remount: the stored preference is re-read on mount", () => {
    stubMatchMedia({ prefersDark: true });
    renderProvider();

    act(() => {
      screen.getByTestId("to-light").click();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");

    cleanup(); // simulate full unmount / page reload

    renderProvider();
    expect(screen.getByTestId("preference").textContent).toBe("light");
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("clearPreference removes the localStorage entry entirely (not just blanks it)", () => {
    stubMatchMedia({ prefersDark: false });
    localStorage.setItem(STORAGE_KEY, "dark");
    renderProvider();

    act(() => {
      screen.getByTestId("clear").click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(Object.keys(localStorage)).not.toContain(STORAGE_KEY);
    expect(screen.getByTestId("preference").textContent).toBe("system");
  });
});

describe("System fallback behavior", () => {
  it("uses dark when no preference is stored and OS prefers dark", () => {
    stubMatchMedia({ prefersDark: true });
    renderProvider();

    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("uses light when no preference is stored and OS prefers light", () => {
    stubMatchMedia({ prefersDark: false });
    renderProvider();

    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("treats an unrecognized stored value as 'system' and does not throw", () => {
    localStorage.setItem(STORAGE_KEY, "neon-carnival");
    stubMatchMedia({ prefersDark: true });

    renderProvider();

    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("reacts to OS changes while on 'system' and stops after an explicit pick", () => {
    let cb: ((e: MediaQueryListEvent) => void) | null = null;
    let removed = 0;
    let prefersDark = false;

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        get matches() {
          return query === "(prefers-color-scheme: dark)" ? prefersDark : false;
        },
        media: query,
        addEventListener: vi.fn((_evt: string, fn: (e: MediaQueryListEvent) => void) => {
          cb = fn;
        }),
        removeEventListener: vi.fn(() => {
          removed += 1;
        }),
        dispatchEvent: vi.fn(),
      }))
    );

    renderProvider();
    expect(screen.getByTestId("theme").textContent).toBe("light");

    // OS flips to dark → provider should follow.
    act(() => {
      prefersDark = true;
      cb?.({ matches: true } as MediaQueryListEvent);
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");

    // User makes an explicit choice → listener is torn down and OS changes
    // must NOT clobber the choice.
    act(() => {
      screen.getByTestId("to-light").click();
    });
    expect(removed).toBeGreaterThan(0);

    act(() => {
      prefersDark = false;
      cb?.({ matches: false } as MediaQueryListEvent);
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("re-attaches the OS listener after clearPreference returns to system", () => {
    const registrations: Array<(e: MediaQueryListEvent) => void> = [];
    let prefersDark = false;

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        get matches() {
          return query === "(prefers-color-scheme: dark)" ? prefersDark : false;
        },
        media: query,
        addEventListener: vi.fn((_evt: string, fn: (e: MediaQueryListEvent) => void) => {
          registrations.push(fn);
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    localStorage.setItem(STORAGE_KEY, "light");
    renderProvider();
    const initialListenerCount = registrations.length;

    act(() => {
      screen.getByTestId("clear").click();
    });

    expect(registrations.length).toBeGreaterThan(initialListenerCount);

    // Newly attached listener responds to the next OS flip.
    act(() => {
      prefersDark = true;
      registrations[registrations.length - 1]({ matches: true } as MediaQueryListEvent);
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});
