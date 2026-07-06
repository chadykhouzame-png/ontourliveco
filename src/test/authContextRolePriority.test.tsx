/**
 * AuthContext role-selection tests.
 *
 * The DB allows a user to hold multiple rows in `user_roles` (admin + venue +
 * artist), so `fetchUserRole` must:
 *   1) never throw on multi-row responses (regression from the old
 *      `.maybeSingle()` call which errored with PGRST116), and
 *   2) always resolve the highest-privilege role: admin > venue > artist.
 *
 * Theme independence is verified by running each scenario under both the
 * `dark` and `light` root class — role selection is pure data and must not
 * depend on the rendered theme.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

// ---- Mocks ------------------------------------------------------------------

const authListeners: Array<(event: string, session: unknown) => void> = [];
let rolesRows: Array<{ role: string }> = [];
let rolesError: { message: string } | null = null;

vi.mock("@/lib/sentry", () => ({ setSentryUser: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => {
  const from = vi.fn((table: string) => {
    if (table !== "user_roles") throw new Error(`unexpected table: ${table}`);
    return {
      select: () => ({
        eq: () => Promise.resolve({ data: rolesRows, error: rolesError }),
      }),
    };
  });

  const fakeSession = {
    user: { id: "user-123", email: "test@example.com" },
  };

  return {
    supabase: {
      from,
      auth: {
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          authListeners.push(cb);
          // Fire immediately so AuthProvider transitions out of loading.
          queueMicrotask(() => cb("SIGNED_IN", fakeSession));
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
        getSession: () =>
          Promise.resolve({ data: { session: fakeSession } }),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    },
  };
});

// Import AFTER the mock is registered.
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// ---- Test harness -----------------------------------------------------------

function RoleProbe() {
  const { userRole, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? "yes" : "no"}</span>
      <span data-testid="role">{userRole ?? "none"}</span>
    </div>
  );
}

async function renderUnderTheme(theme: "dark" | "light") {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
  render(
    <AuthProvider>
      <RoleProbe />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("loading").textContent).toBe("no"),
  );
}

beforeEach(() => {
  rolesRows = [];
  rolesError = null;
  authListeners.length = 0;
});

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark", "light");
});

// ---- Cases ------------------------------------------------------------------

const CASES: Array<{
  name: string;
  rows: Array<{ role: string }>;
  expected: "admin" | "venue" | "artist" | "none";
}> = [
  { name: "admin + venue + artist → admin", rows: [{ role: "artist" }, { role: "venue" }, { role: "admin" }], expected: "admin" },
  { name: "venue + artist → venue", rows: [{ role: "artist" }, { role: "venue" }], expected: "venue" },
  { name: "admin + artist → admin", rows: [{ role: "admin" }, { role: "artist" }], expected: "admin" },
  { name: "artist only → artist", rows: [{ role: "artist" }], expected: "artist" },
  { name: "venue only → venue", rows: [{ role: "venue" }], expected: "venue" },
  { name: "admin only → admin", rows: [{ role: "admin" }], expected: "admin" },
  { name: "no rows → none", rows: [], expected: "none" },
];

for (const theme of ["dark", "light"] as const) {
  describe(`AuthContext role priority — ${theme} theme`, () => {
    for (const c of CASES) {
      it(c.name, async () => {
        rolesRows = c.rows;
        await renderUnderTheme(theme);
        await waitFor(() =>
          expect(screen.getByTestId("role").textContent).toBe(c.expected),
        );
        // Confirms theme independence: the class we set is still on <html>.
        expect(document.documentElement.classList.contains(theme)).toBe(true);
      });
    }

    it("does not throw and falls back to none when the query errors", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      rolesError = { message: "boom" };
      rolesRows = [];
      await renderUnderTheme(theme);
      await waitFor(() =>
        expect(screen.getByTestId("role").textContent).toBe("none"),
      );
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
}
