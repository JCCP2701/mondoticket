import * as React from "react";

import { ChartContainer, type ChartConfig } from "../../ui/chart";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  footnote?: string;
  config: ChartConfig;
  height?: number;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ComponentProps<typeof ChartContainer>["children"];
}

export function ChartCard({
  title,
  subtitle,
  footnote,
  config,
  height = 240,
  empty,
  emptyMessage,
  children,
}: ChartCardProps) {
  return (
    <div className="bg-card p-6 rounded-xl border border-border">
      <div className="mb-4">
        <h3 className="font-bold">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {empty ? (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground italic"
          style={{ height: `${height}px` }}
        >
          {emptyMessage ?? "Sin datos suficientes todavía."}
        </div>
      ) : (
        <ChartContainer config={config} className="w-full" style={{ height: `${height}px` }}>
          {children}
        </ChartContainer>
      )}
      {footnote && (
        <p className="text-xs text-muted-foreground mt-3">{footnote}</p>
      )}
    </div>
  );
}
