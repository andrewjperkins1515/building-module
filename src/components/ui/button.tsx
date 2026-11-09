import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-navy text-white shadow-xs hover:bg-navy-2",
        accent: "bg-accent text-white shadow-xs hover:bg-accent-hover",
        outline: "border border-border-strong/80 bg-background text-ink-2 shadow-xs hover:bg-subtle hover:text-ink",
        secondary: "bg-subtle text-ink-2 hover:bg-muted hover:text-ink",
        ghost: "text-ink-3 hover:bg-subtle hover:text-ink",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
        success: "bg-success text-white shadow-xs hover:bg-success/90",
        danger: "bg-danger text-white shadow-xs hover:bg-danger/90",
        "danger-outline": "border border-danger-line bg-background text-danger hover:bg-danger-soft",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        lg: "h-9 px-4",
        icon: "size-8",
        "icon-sm": "size-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, type, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} type={asChild ? undefined : (type ?? "button")} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
