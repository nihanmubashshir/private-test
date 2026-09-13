"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Toggle as TogglePrimitive } from "radix-ui"

/** Segmented-control look (01-design-system.md §4.3) — never gold, per §10.2. */
const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-body-sm font-semibold text-neutral-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500 disabled:pointer-events-none disabled:opacity-50 hover:text-neutral-50 data-[state=on]:bg-neutral-800 data-[state=on]:text-neutral-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "bg-transparent",
      },
      size: {
        default: "h-9 min-w-9 rounded-sm px-3",
        sm: "h-8 min-w-8 rounded-sm px-2.5 text-sm",
        lg: "h-10 min-w-10 rounded-sm px-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
