import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-border bg-background-muted px-3 py-2",
        "text-sm text-text-primary placeholder:text-text-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:border-primary-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y transition-all",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
