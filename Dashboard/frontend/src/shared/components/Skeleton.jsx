const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
)

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((__, j) => (
          <Skeleton key={j} className="h-10 flex-1" />
        ))}
      </div>
    ))}
  </div>
)

export default Skeleton
