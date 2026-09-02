import * as React from "react";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function SectionHeader({ eyebrow, title, subtitle, icon: Icon }: SectionHeaderProps) {
  return (
    <div>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
