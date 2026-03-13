import Link from "next/link"

import { Button } from "@/components/ui/button"

/**
 * src/app/not-found.tsx
 *
 * Global 404 page for unresolved routes.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-1 text-2xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
