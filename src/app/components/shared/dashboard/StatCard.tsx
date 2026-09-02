import * as React from "react";
import { Link } from "react-router";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "../../ui/utils";

export type StatStatus = "neutral" | "good" | "warning" | "critical";

export interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  status?: StatStatus;
  statusLabel?: string;
  caption?: string;
  href?: string;
}

const STATUS_ICON_CHIP: Record<StatStatus, string> = {
  neutral: "bg-primary/10",
  good: "bg-success/10",
  warning: "bg-warning/10",
  critical: "bg-destructive/10",
};

const STATUS_ICON_COLOR: Record<StatStatus, string> = {
  neutral: "text-primary",
  good: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
};

const STATUS_PILL_COLOR: Record<StatStatus, string> = {
  neutral: "",
  good: "text-success",
  warning: "text-warning",
  critical: "text-destructive",
};

const STATUS_PILL_ICON: Record<StatStatus, React.ComponentType<{ className?: string }> | null> = {
  neutral: null,
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertCircle,
};

export function StatCard({
  label,
  value,
  icon: Icon,
  status = "neutral",
  statusLabel,
  caption,
  href,
}: StatCardProps) {
  if (import.meta.env.DEV && status !== "neutral" && !statusLabel) {
    console.warn(
      `StatCard: "status" is "${status}" but no "statusLabel" was provided (label: "${label}"). Provide a statusLabel to describe the status instead of shipping a bare color.`,
    );
  }

  const StatusIcon = STATUS_PILL_ICON[status];

  const content = (
    <div className="bg-card p-6 rounded-xl border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-3 rounded-lg", STATUS_ICON_CHIP[status])}>
          <Icon className={cn("w-6 h-6", STATUS_ICON_COLOR[status])} />
        </div>
        <span className="text-sm font-bold text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {caption && (
        <p className="text-xs text-muted-foreground mt-1">{caption}</p>
      )}
      {status !== "neutral" && statusLabel && StatusIcon && (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 mt-2 text-xs font-bold",
            STATUS_PILL_COLOR[status],
          )}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {statusLabel}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block hover:border-primary/40 transition-colors">
        {content}
      </Link>
    );
  }

  return content;
}
