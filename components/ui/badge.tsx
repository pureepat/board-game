import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-transparent bg-wolf-purple/80 text-moon-200",
      werewolf: "border-transparent bg-crimson-600 text-moon-200",
      villager: "border-transparent bg-emerald-700/80 text-moon-200",
      dead: "border-moon-400/30 text-moon-400 bg-transparent line-through",
      outline: "border-moon-400/40 text-moon-300",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
