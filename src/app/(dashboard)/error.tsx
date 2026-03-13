"use client"

/**
 * src/app/(dashboard)/error.tsx
 *
 * Error boundary UI for dashboard segment.
 */

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard segment error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Terjadi kesalahan pada dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Silakan coba lagi. Jika masalah berlanjut, hubungi administrator.
        </p>
        <div className="mt-5">
          <Button onClick={reset}>Coba lagi</Button>
        </div>
      </div>
    </div>
  )
}
