import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-100 ease-out cursor-default select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/20 text-primary hover:bg-primary/30",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive/20 text-destructive hover:bg-destructive/30",
        outline: "border-border/50 text-foreground bg-secondary/30 hover:bg-secondary/50",
        artist: "border-transparent bg-artist/20 text-artist hover:bg-artist/30",
        venue: "border-transparent bg-venue/20 text-venue hover:bg-venue/30",
      },
      interactive: {
        true: "cursor-pointer active:scale-[0.92] active:duration-[40ms] [&:not(:active)]:duration-250 [&:not(:active)]:ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, interactive, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, interactive }), className)} {...props} />;
}

export { Badge, badgeVariants };
