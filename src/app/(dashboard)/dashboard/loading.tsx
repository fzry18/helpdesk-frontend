/**
 * src/app/(dashboard)/dashboard/loading.tsx
 */

export default function DashboardHomeLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-60 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-28 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
      </div>
    </div>
  )
}
