import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

const STORAGE_KEY = "otl.theme";

function TestConsumer() {
  const { theme, preference, setPreference, cycle } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="preference">{preference}</div>
      <button data-testid="cycle" onClick={cycle}>
        Cycle
      </button>
      <button data-testid="set-system" onClick={() => setPreference("system")}>
        System
      </button>
      <button data-testid="set-light" onClick={() => setPreference("light")}>
        Light
      </button>
      <button data-testid="set-dark" onClick={() => setPreference("dark")}>
        Dark
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

  it("cycles light → dark → system → light", () => {
    renderProvider();
    // Initial: system
    expect(screen.getByTestId("preference").textContent).toBe("system");

    act(() => screen.getByTestId("cycle").click());
    expect(screen.getByTestId("preference").textContent).toBe("light");

    act(() => screen.getByTestId("cycle").click());
    expect(screen.getByTestId("preference").textContent).toBe("dark");
    expect(screen.getByTestId("theme").textContent).toBe("dark");

    act(() => screen.getByTestId("cycle").click());
    expect(screen.getByTestId("preference").textContent).toBe("system");
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
