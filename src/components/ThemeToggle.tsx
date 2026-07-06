import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

const ICON_BASE = "absolute h-4 w-4 transition-all duration-300";
const HIDDEN = "opacity-0 scale-75";
const VISIBLE = "opacity-100 scale-100 rotate-0";

/**
 * Header-friendly light/dark/system toggle. Icon-only, hairline outline, honours
 * the site's uppercase/tracked button language via the `outline` variant.
 *
 * Cycles light → dark → system → light. When "system" is selected, the site
 * follows the OS color scheme and automatically updates when it changes.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, preference, cycle } = useTheme();

  const isLight = preference === "light";
  const isDark = preference === "dark";
  const isSystem = preference === "system";

  let title: string;
  if (isSystem) {
    title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  } else if (isLight) {
    title = "Switch to dark theme";
  } else {
    title = "Switch to system theme";
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={title}
      aria-pressed={!isSystem}
      title={title}
      onClick={cycle}
      className={cn("relative", className)}
    >
      {/* Cross-fading Sun/Moon/Monitor — no layout shift on toggle */}
      <Sun
        aria-hidden
        className={cn(
          ICON_BASE,
          isLight ? VISIBLE : "opacity-0 -rotate-90 scale-75"
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          ICON_BASE,
          isDark ? VISIBLE : "opacity-0 rotate-90 scale-75"
        )}
      />
      <Monitor
        aria-hidden
        className={cn(ICON_BASE, isSystem ? VISIBLE : HIDDEN)}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default ThemeToggle;
