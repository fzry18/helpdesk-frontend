/**
 * TicketList.tsx — Feature: Tickets / Components
 *
 * Komponen utama daftar tiket. Mendukung tiga mode:
 *  1. "card"  — grid kartu (TicketCard)
 *  2. "table" — tabel kompak
 *
 * State flow:
 *  - Filter dari ticket-filter.store
 *  - Data dari useTicketList() hook
 *  - Navigasi ke detail via onTicketClick callback
 */

"use client"

import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { TicketCard } from "./TicketCard"
import { TicketStatusBadge } from "./TicketStatusBadge"
import { TicketPriorityBadge } from "./TicketPriorityBadge"
import { useTicketList, usePrefetchTicket } from "@/features/tickets/hooks/use-ticket-list"
import { useTicketFilterStore } from "@/features/tickets/stores/ticket-filter.store"
import { useTicketUIStore } from "@/features/tickets/stores/ticket-ui.store"
import { formatDate } from "@/lib/utils/date"
import { cn } from "@/lib/utils/cn"
import type { Ticket } from "@/types"

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface TicketListProps {
  /** Mode tampilan daftar — default: ambil dari store */
  viewMode?: "card" | "table"
  /** Callback saat tiket diklik — biasanya navigate ke detail page */
  onTicketClick?: (ticket: Ticket) => void
  className?: string
}

// ─────────────────────────────────────────────────────────────
// Skeleton loaders
// ─────────────────────────────────────────────────────────────

function CardListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-lg" />
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded" />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────

function EmptyState() {
  const resetFilters = useTicketFilterStore((s) => s.resetFilters)
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="text-4xl">📋</span>
      <div>
        <p className="text-lg font-semibold">Tidak ada tiket ditemukan</p>
        <p className="text-sm text-muted-foreground">
          Coba ubah filter atau buat tiket baru.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={resetFilters}>
        Reset Filter
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function TicketList({
  viewMode: viewModeOverride,
  onTicketClick,
  className,
}: TicketListProps) {
  const { data, isLoading, isError, error } = useTicketList()
  const prefetch = usePrefetchTicket()

  const storeViewMode = useTicketUIStore((s) => s.viewMode)
  const viewMode = viewModeOverride ?? (storeViewMode === "kanban" ? "card" : storeViewMode)

  const selectedTicketId = useTicketUIStore((s) => s.selectedTicketId)
  const openDialog = useTicketUIStore((s) => s.openDialog)

  const page = useTicketFilterStore((s) => s.page)
  const pageSize = useTicketFilterStore((s) => s.pageSize)
  const setPage = useTicketFilterStore((s) => s.setPage)

  const tickets = useMemo(() => data?.data ?? [], [data])
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const handleTicketClick = (ticket: Ticket) => {
    if (onTicketClick) {
      onTicketClick(ticket)
    } else {
      openDialog("detail", ticket)
    }
  }

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return viewMode === "card" ? <CardListSkeleton /> : <TableSkeleton />
  }

  // ── Error state ────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-destructive">
        <span className="text-3xl">⚠️</span>
        <p className="font-semibold">Gagal memuat tiket</p>
        <p className="text-sm">{error?.message ?? "Terjadi kesalahan server"}</p>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────
  if (!tickets.length) {
    return <EmptyState />
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* ──────────── Card mode ──────────── */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isSelected={ticket.id === selectedTicketId}
              onSelect={handleTicketClick}
            />
          ))}
        </div>
      )}

      {/* ──────────── Table mode ──────────── */}
      {viewMode === "table" && (
        <div className="w-full overflow-x-auto rounded-lg border">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                  No. Tiket
                </th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                  Judul
                </th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                  Prioritas
                </th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                  Assignee
                </th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                  Dibuat
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => handleTicketClick(ticket)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleTicketClick(ticket)
                    }
                  }}
                  onMouseEnter={() => prefetch(ticket.id)}
                  className={cn(
                    "cursor-pointer border-b transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    ticket.id === selectedTicketId && "bg-primary/5",
                  )}
                  aria-selected={ticket.id === selectedTicketId}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      #{ticket.ticket_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="line-clamp-1 max-w-xs font-medium">{ticket.subject}</p>
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusBadge ticket={ticket} variant="tag" />
                  </td>
                  <td className="px-4 py-3">
                    <TicketPriorityBadge ticket={ticket} display="label" />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ticket.assigned_employee?.name ?? ticket.assigned_user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(ticket.create_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────── Pagination ──────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari{" "}
            {total} tiket
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Halaman sebelumnya"
            >
              ‹ Sebelumnya
            </Button>
            <span className="px-3 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label="Halaman berikutnya"
            >
              Berikutnya ›
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
