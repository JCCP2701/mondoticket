import * as React from "react";

export interface DashboardTableCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function DashboardTableCard({
  title,
  subtitle,
  action,
  isEmpty,
  emptyMessage,
  children,
}: DashboardTableCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground italic p-6">
          {emptyMessage ?? "Sin datos por ahora."}
        </p>
      ) : (
        children
      )}
    </div>
  );
}
