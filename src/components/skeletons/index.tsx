/** Skeleton loading components for Suspense fallbacks */

function Pulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className ?? ""}`} style={style} />
  );
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
        >
          <Pulse className="mb-3 h-4 w-24" />
          <Pulse className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TaskListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-3">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-4 w-24" />
        <Pulse className="h-4 w-20" />
        <Pulse className="ml-auto h-4 w-16" />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-800"
        >
          <Pulse className="h-4 w-48" />
          <Pulse className="h-4 w-20" />
          <Pulse className="h-4 w-16" />
          <Pulse className="ml-auto h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <Pulse className="mb-6 h-5 w-40" />
      <div className="flex items-end gap-3" style={{ height: 200 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Pulse
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.random() * 70}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, col) => (
        <div
          key={col}
          className="w-72 flex-shrink-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <Pulse className="mb-4 h-5 w-28" />
          {Array.from({ length: 3 }).map((_, row) => (
            <div
              key={row}
              className="mb-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
            >
              <Pulse className="mb-2 h-4 w-full" />
              <Pulse className="mb-2 h-3 w-3/4" />
              <div className="flex gap-2">
                <Pulse className="h-5 w-16 rounded-full" />
                <Pulse className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <KPISkeleton />
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TaskListSkeleton rows={5} />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#98af3b]" />
        <span>Carregando...</span>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800">
          {Array.from({ length: cols }).map((_, j) => (
            <Pulse key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
