import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-muted", className)} // Removed rounded-md
      {...props}
    />
  )
}

export { Skeleton }
