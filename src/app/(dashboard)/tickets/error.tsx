"use client"

/**
 * src/app/(dashboard)/tickets/error.tsx
 */

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function TicketsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Tickets segment error:", error)
  }, [error])

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Gagal memuat daftar tiket</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Coba muat ulang segmen tiket untuk melanjutkan.
        </p>
        <div className="mt-5">
          <Button onClick={reset}>Muat ulang</Button>
        </div>
      </div>
    </div>
  )
}
