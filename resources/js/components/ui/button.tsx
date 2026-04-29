import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,box-shadow,transform,background-color,border-color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/45 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border border-primary/15 bg-primary text-primary-foreground shadow-[0_18px_38px_-24px_rgba(15,23,42,0.72)] hover:bg-primary/92 hover:-translate-y-0.5",
        destructive:
          "border border-destructive/20 bg-destructive text-white shadow-[0_18px_38px_-24px_rgba(127,29,29,0.72)] hover:bg-destructive/92 hover:-translate-y-0.5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-input bg-background/88 text-foreground shadow-[0_12px_32px_-28px_rgba(15,23,42,0.7)] hover:bg-accent/70 hover:text-accent-foreground hover:-translate-y-0.5",
        secondary:
          "border border-secondary/40 bg-secondary/88 text-secondary-foreground shadow-[0_12px_32px_-28px_rgba(15,23,42,0.68)] hover:bg-secondary hover:-translate-y-0.5",
        ghost: "text-foreground hover:bg-accent/70 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2.5 has-[>svg]:px-3.5",
        sm: "h-9 rounded-lg px-3.5 has-[>svg]:px-3",
        lg: "h-12 rounded-2xl px-6 has-[>svg]:px-4.5",
        icon: "size-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
