import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "border-border/60 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div
          aria-hidden
          className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full"
        >
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
