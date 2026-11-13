import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/80 ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl border border-zinc-200/80 bg-white shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 rounded-lg" />
        <Skeleton className="h-4 w-16 rounded-md" />
      </div>
      <Skeleton className="h-4 w-48 rounded-md" />
      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-zinc-100 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-4 w-full max-w-[120px] rounded-md" />
        </td>
      ))}
    </tr>
  );
}
