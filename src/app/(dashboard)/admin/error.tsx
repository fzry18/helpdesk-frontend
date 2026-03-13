"use client"

/**
 * src/app/(dashboard)/admin/error.tsx
 */

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Admin segment error:", error)
  }, [error])

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Gagal memuat halaman admin</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Coba lagi atau hubungi super admin jika error berulang.
        </p>
        <div className="mt-5">
          <Button onClick={reset}>Coba lagi</Button>
        </div>
      </div>
    </div>
  )
}
