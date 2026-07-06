import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// First Light brand kit:
// - Hairline 1px borders (border-border), small engraved radii (rounded-md ≈ 6px)
// - No drop shadows, no gradients
// - Body font (Outfit) with wide UI tracking on labels
// - Champagne accent used sparingly
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-[0.2em] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:normal-case transition-all duration-100 ease-out origin-center active:scale-[0.97] active:duration-[50ms] [&:not(:active)]:duration-300 [&:not(:active)]:ease-[cubic-bezier(0.34,1.56,0.64,1)]",
  {
    variants: {
      variant: {
        // Primary = champagne on noir. No shadow, hairline edge on hover.
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85",
        // Champagne outline — the editorial call to action
        champagne:
          "border border-primary/70 bg-transparent text-primary hover:bg-primary/10 hover:border-primary active:bg-primary/15",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/85",
        // Hairline ivory outline — the quiet default
        outline:
          "border border-border bg-transparent text-foreground hover:border-foreground/60 hover:bg-foreground/[0.03] active:bg-foreground/[0.06]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/60 hover:bg-secondary/80 active:bg-secondary/90",
        ghost:
          "text-foreground hover:bg-foreground/[0.04] active:bg-foreground/[0.07]",
        link:
          "text-primary underline-offset-4 hover:underline active:opacity-70 tracking-normal normal-case font-normal",
      },
      size: {
        default: "h-11 px-5 py-2.5 rounded-md",
        sm: "h-9 rounded-md px-4 text-[10px] tracking-[0.25em]",
        lg: "h-12 rounded-md px-8 text-sm tracking-[0.25em]",
        icon: "h-11 w-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
