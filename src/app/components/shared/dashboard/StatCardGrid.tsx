import * as React from "react";

import { cn } from "../../ui/utils";

export interface StatCardGridProps {
  columns?: 2 | 3 | 4 | 6 | 7;
  children: React.ReactNode;
}

export function StatCardGrid({ columns = 4, children }: StatCardGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-6",
        columns >= 3 && "lg:grid-cols-3",
        columns >= 4 && columns < 6 && "lg:grid-cols-4",
        columns === 6 && "lg:grid-cols-6",
        columns >= 7 && "lg:grid-cols-7",
      )}
    >
      {children}
    </div>
  );
}
