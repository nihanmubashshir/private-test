import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  pending?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { href?: undefined };
type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-500 text-on-accent font-semibold hover:bg-accent-600 aria-disabled:bg-accent-500/70 disabled:bg-neutral-700 disabled:text-neutral-500",
  secondary:
    "bg-transparent border border-neutral-700 text-neutral-50 font-semibold hover:bg-neutral-800 hover:border-neutral-600 aria-disabled:text-neutral-400 disabled:border-neutral-800 disabled:text-neutral-600",
  ghost: "bg-transparent text-neutral-300 font-medium hover:bg-neutral-800 hover:text-neutral-50 aria-disabled:text-neutral-500 disabled:text-neutral-600",
  danger:
    "bg-danger-950 border border-danger-800 text-danger-400 font-semibold hover:bg-danger-900 hover:border-danger-400 focus-visible:outline-danger-400 aria-disabled:text-danger-800 disabled:border-neutral-800 disabled:text-neutral-600",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-sm gap-1.5",
  md: "h-tap px-4 text-control rounded-md gap-2",
  lg: "h-[52px] px-5 text-base rounded-md gap-2",
};

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", fullWidth, pending, className, children, ...rest } =
    props;
  const isDisabled = "disabled" in rest ? Boolean(rest.disabled) || pending : pending;

  const classes = cn(
    "inline-flex items-center justify-center whitespace-nowrap transition-colors motion-reduce:transition-none disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
    className,
  );

  if (rest.href) {
    const { href, ...anchorRest } = rest;
    return (
      <a
        href={href}
        className={classes}
        aria-disabled={isDisabled || undefined}
        {...(anchorRest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
      >
        {pending && <Spinner size={12} />}
        {children}
      </a>
    );
  }

  const buttonRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;
  return (
    <button
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      {...buttonRest}
    >
      {pending && <Spinner size={12} />}
      {children}
    </button>
  );
}
