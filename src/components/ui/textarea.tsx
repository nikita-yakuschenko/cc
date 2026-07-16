import * as React from "react";
import { cn } from "@/lib/utils";

const textareaClassName =
  "flex min-h-[80px] w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-carbon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(textareaClassName, className)}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
