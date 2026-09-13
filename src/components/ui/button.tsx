import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap transition-colors motion-safe:active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-500 text-on-accent font-semibold hover:bg-accent-600 active:bg-accent-700 aria-disabled:bg-accent-500/70 disabled:bg-neutral-700 disabled:text-neutral-500",
        secondary:
          "bg-transparent border border-neutral-700 text-neutral-50 font-semibold hover:bg-neutral-800 hover:border-neutral-600 active:bg-neutral-900 aria-disabled:text-neutral-400 disabled:border-neutral-800 disabled:text-neutral-600",
        ghost:
          "bg-transparent text-neutral-300 font-medium hover:bg-neutral-800 hover:text-neutral-50 active:bg-neutral-900 aria-disabled:text-neutral-500 disabled:text-neutral-600",
        danger:
          "bg-danger-950 border border-danger-800 text-danger-400 font-semibold hover:bg-danger-900 hover:border-danger-400 active:bg-danger-950/60 focus-visible:ring-danger-400 aria-disabled:text-danger-800 disabled:border-neutral-800 disabled:text-neutral-600",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-sm gap-1.5",
        md: "h-tap px-4 text-control rounded-md gap-2",
        lg: "h-[52px] px-5 text-base rounded-md gap-2",
        icon: "h-tap w-tap rounded-full p-0",
        quick: "h-14 w-14 rounded-full p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    pending?: boolean;
  };

export function Button({
  variant,
  size,
  fullWidth,
  asChild = false,
  pending,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || pending;
  const classes = cn(buttonVariants({ variant, size, fullWidth, className }));

  if (asChild) {
    return (
      <Slot.Root className={classes} aria-disabled={isDisabled || undefined} {...rest}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      {...rest}
    >
      {pending && <Spinner size={12} />}
      {children}
    </button>
  );
}
