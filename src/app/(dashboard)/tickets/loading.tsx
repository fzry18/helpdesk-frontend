/**
 * src/app/(dashboard)/tickets/loading.tsx
 */

export default function TicketsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-40 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    </div>
  )
}
