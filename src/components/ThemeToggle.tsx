import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

const ICON_BASE = "absolute h-4 w-4 transition-all duration-300";
const HIDDEN = "opacity-0 scale-75";
const VISIBLE = "opacity-100 scale-100 rotate-0";

/**
 * Theme selector with an explicit "System" option that clears the saved
 * preference and lets the app follow the OS color scheme again.
 *
 * The trigger keeps the same icon-only footprint as the old toggle, but now
 * opens a menu for explicit control.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, preference, setPreference, clearPreference } = useTheme();

  const isLight = preference === "light";
  const isDark = preference === "dark";
  const isSystem = preference === "system";

  const resolvedLabel = theme === "dark" ? "Dark" : "Light";
  const title = `Theme: ${resolvedLabel} (${preference})`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={title}
          title={title}
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => {
            if (value === "system") {
              clearPreference();
            } else {
              setPreference(value as "light" | "dark");
            }
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" aria-hidden />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" aria-hidden />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" aria-hidden />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
