/**
 * TicketFilters.tsx — Feature: Tickets / Components
 *
 * Filter bar untuk daftar tiket. Berinteraksi langsung dengan
 * useTicketFilterStore — tidak perlu props filter dari parent.
 *
 * Tampilkan: search input + tab status (All / Baru / Dalam Proses / dll)
 * + dropdown priority + button reset.
 */

"use client"

import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/cn"
import { useTicketFilterStore } from "@/features/tickets/stores/ticket-filter.store"

// ─────────────────────────────────────────────────────────────
// Tab config
// ─────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: null, label: "Semua" },
  { value: "In Progress", label: "Dalam Proses" },
  { value: "New", label: "Baru" },
  { value: "Waiting Confirmation", label: "Menunggu" },
  { value: "Done", label: "Selesai" },
] as const

const PRIORITY_OPTIONS = [
  { value: null, label: "Semua Prioritas" },
  { value: "4", label: "Sangat Tinggi" },
  { value: "3", label: "Tinggi" },
  { value: "2", label: "Normal" },
  { value: "1", label: "Rendah" },
  { value: "0", label: "Sangat Rendah" },
]

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

interface TicketFiltersProps {
  className?: string
  /** Tampilkan opsi filter kategori (helper/system) — pas untuk Super Admin */
  showCategoryFilter?: boolean
}

export function TicketFilters({
  className,
  showCategoryFilter = false,
}: TicketFiltersProps) {
  const status = useTicketFilterStore((s) => s.status)
  const priority = useTicketFilterStore((s) => s.priority)
  const search = useTicketFilterStore((s) => s.search)
  const ticketCategoryType = useTicketFilterStore((s) => s.ticketCategoryType)

  const setStatus = useTicketFilterStore((s) => s.setStatus)
  const setPriority = useTicketFilterStore((s) => s.setPriority)
  const setSearch = useTicketFilterStore((s) => s.setSearch)
  const setTicketCategoryType = useTicketFilterStore((s) => s.setTicketCategoryType)
  const resetFilters = useTicketFilterStore((s) => s.resetFilters)

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    [setSearch],
  )

  const hasActiveFilter =
    !!status || !!priority || !!search || !!ticketCategoryType

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Row 1: Search + Reset */}
      <div className="flex items-center gap-2">
        <Input
          type="search"
          placeholder="Cari nomor / judul tiket…"
          value={search}
          onChange={handleSearch}
          className="max-w-xs"
          aria-label="Cari tiket"
        />

        {showCategoryFilter && (
          <div className="flex gap-1" role="group" aria-label="Filter kategori">
            {(["helper", "system", null] as const).map((val) => (
              <Button
                key={val ?? "all"}
                size="sm"
                variant={ticketCategoryType === val ? "default" : "outline"}
                onClick={() => setTicketCategoryType(val)}
              >
                {val === "helper" ? "Helper" : val === "system" ? "System" : "Semua"}
              </Button>
            ))}
          </div>
        )}

        {/* Priority select */}
        <select
          value={priority ?? ""}
          onChange={(e) => setPriority(e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Filter prioritas"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value ?? "all"} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        )}
      </div>

      {/* Row 2: Status tabs */}
      <div
        className="flex flex-wrap items-center gap-1"
        role="tablist"
        aria-label="Filter status tiket"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value
          return (
            <button
              key={tab.label}
              role="tab"
              aria-selected={isActive}
              onClick={() => setStatus(tab.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {tab.label}
            </button>
          )
        })}

        {hasActiveFilter && (
          <Badge variant="secondary" className="ml-1 text-xs">
            Filter aktif
          </Badge>
        )}
      </div>
    </div>
  )
}
