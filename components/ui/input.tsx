import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-wolf-purple/40 bg-night-900/80 px-3 py-2 text-sm text-moon-200 placeholder:text-moon-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
