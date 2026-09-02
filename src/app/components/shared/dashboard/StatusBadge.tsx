import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "../../ui/utils";

export type Status = "good" | "warning" | "critical" | "neutral" | "info";

export interface StatusBadgeProps {
  status: Status;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  size?: "sm" | "md";
}

const DEFAULT_ICON: Record<Status, React.ComponentType<{ className?: string }>> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertCircle,
  info: Info,
  neutral: Info,
};

const STATUS_COLOR: Record<Status, string> = {
  good: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
  neutral: "bg-primary/10 text-primary",
};

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "text-xs",
  md: "text-sm px-3 py-1.5",
};

const ICON_SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
};

export function StatusBadge({ status, label, icon, size = "sm" }: StatusBadgeProps) {
  const Icon = icon ?? DEFAULT_ICON[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold",
        SIZE_CLASSES[size],
        STATUS_COLOR[status],
      )}
    >
      <Icon className={ICON_SIZE_CLASSES[size]} />
      {label}
    </span>
  );
}
