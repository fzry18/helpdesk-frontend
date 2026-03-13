/**
 * src/app/(dashboard)/tickets/[id]/loading.tsx
 */

export default function TicketDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-64 animate-pulse rounded bg-muted" />
      <div className="h-28 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-52 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-40 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  )
}
