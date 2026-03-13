/**
 * src/app/(dashboard)/admin/loading.tsx
 */

export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="h-28 animate-pulse rounded-lg border bg-muted/40" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-36 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    </div>
  )
}
