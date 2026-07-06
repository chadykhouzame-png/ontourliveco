import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

const STORAGE_KEY = "otl.theme";

function TestConsumer() {
  const { theme, preference, setPreference, clearPreference } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="preference">{preference}</div>
      <button data-testid="set-light" onClick={() => setPreference("light")}>
        Light
      </button>
      <button data-testid="set-dark" onClick={() => setPreference("dark")}>
        Dark
      </button>
      <button data-testid="set-system" onClick={() => setPreference("system")}>
        Set System
      </button>
      <button data-testid="clear" onClick={clearPreference}>
        Clear
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.style.removeProperty("colorScheme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to system preference when no localStorage value exists", () => {
    renderProvider();
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("resolves the system preference from the OS color scheme", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
    renderProvider();
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores an explicit saved preference from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    renderProvider();
    expect(screen.getByTestId("preference").textContent).toBe("light");
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setPreference persists and applies the theme", () => {
    renderProvider();
    act(() => {
      screen.getByTestId("set-light").click();
    });
    expect(screen.getByTestId("preference").textContent).toBe("light");
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("clearPreference removes the saved value and reverts to system", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    renderProvider();
    expect(screen.getByTestId("preference").textContent).toBe("dark");

    act(() => {
      screen.getByTestId("clear").click();
    });

    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("follows OS color-scheme changes while system is selected", () => {
    let changeCallback: ((e: MediaQueryListEvent) => void) | null = null;
    let matches = false;

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        get matches() {
          return matches;
        },
        media: query,
        addEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
          changeCallback = cb;
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    renderProvider();
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("theme").textContent).toBe("light");

    act(() => {
      matches = true;
      changeCallback?.({ matches: true } as MediaQueryListEvent);
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("stops following OS changes when an explicit preference is chosen", () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: addListener,
        removeEventListener: removeListener,
        dispatchEvent: vi.fn(),
      }))
    );

    renderProvider();
    expect(addListener).toHaveBeenCalled(); // system registers the listener

    act(() => {
      screen.getByTestId("set-light").click();
    });

    expect(removeListener).toHaveBeenCalled();
    expect(addListener).toHaveBeenCalledTimes(1); // no re-registration after going explicit
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });
});

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.style.removeProperty("colorScheme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a menu with Light, Dark, and System options", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    const { ThemeToggle } = await import("@/components/ThemeToggle");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: /theme/i }));
    expect(screen.getByRole("menuitemradio", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /system/i })).toBeInTheDocument();
  });

  it("selecting System clears the saved preference", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, "dark");

    const { ThemeToggle } = await import("@/components/ThemeToggle");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: /theme/i }));
    await user.click(screen.getByRole("menuitemradio", { name: /system/i }));

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: /theme/i })).toHaveAttribute("aria-label", expect.stringContaining("system"));
  });
});
