import * as React from "react";
import { cn } from "@/lib/utils";

const inputClassName =
  "flex h-10 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-carbon transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(inputClassName, className)}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
