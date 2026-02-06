"use client"

import { useState, useMemo, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import { TicketList } from "@/components/helpdesk/tickets/TicketList"
import { TicketFilters, type TicketFilterValues } from "@/components/helpdesk/tickets/TicketFilters"
import { CreateTicketDialog } from "@/components/helpdesk/tickets/CreateTicketDialog"
import { Button } from "@/components/ui/button"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { useTicketList } from "@/hooks/use-ticket-queries"
import { useTicketWebSocket } from "@/hooks/use-ticket-websocket"
import type { Ticket } from "@/types"

const PAGE_SIZE = 20

function getTicketStatusGroup(ticket: Ticket): "Open" | "In Progress" | "Closed" {
  const name = ((ticket.stage?.actual_name ?? ticket.stage?.name) ?? "").toString().toLowerCase()
  if (name.includes("closed") || name.includes("selesai") || ticket.resolution_confirmed === true) return "Closed"
  if (name.includes("progress") || name.includes("in progress") || name.includes("awaiting") || name.includes("confirmation") || name.includes("menunggu")) return "In Progress"
  return "Open"
}

export default function TicketsPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<TicketFilterValues>({
    status: "all",
  })

  // Map frontend status filter to API status parameter
  const apiStatus = useMemo(() => {
    if (filters.status === "open") return "open"
    if (filters.status === "in_progress") return "open" // Backend doesn't have in_progress, filter client-side
    if (filters.status === "closed") return "closed"
    return "all"
  }, [filters.status])

  // Fetch tickets with pagination
  const { data, isLoading, error, isFetching } = useTicketList({
    page,
    limit: PAGE_SIZE,
    status: apiStatus,
    priority: filters.priority,
    ticket_category_type: filters.ticket_category_type,
    my_tickets: !isAdmin,
  })

  // WebSocket untuk real-time updates
  useTicketWebSocket({ enabled: true })

  // Filter tickets client-side untuk in_progress (backend tidak support langsung)
  const filteredTickets = useMemo(() => {
    const raw = data?.data
    let list: Ticket[] | null = null
    if (Array.isArray(raw)) list = raw
    else if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: Ticket[] }).data))
      list = (raw as { data: Ticket[] }).data
    if (!list) return null
    
    // Only filter in_progress on client side since backend may not support it directly
    if (filters.status === "in_progress") {
      return list.filter((t) => getTicketStatusGroup(t) === "In Progress")
    }
    if (filters.status === "open") {
      return list.filter((t) => getTicketStatusGroup(t) === "Open")
    }
    return list
  }, [data?.data, filters.status])

  // Reset page saat filter berubah
  const handleFilterChange = useCallback((newFilters: TicketFilterValues) => {
    setFilters(newFilters)
    setPage(1) // Reset ke halaman pertama
  }, [])

  const meta = data?.meta
  const hasNextPage = meta?.has_next ?? false
  const hasPrevPage = meta?.has_prev ?? (page > 1)
  const totalPages = meta?.total_pages ?? 1
  const totalTickets = meta?.total ?? 0

  return (
    <div className="min-w-0 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">Tickets</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Kelola tiket helpdesk. Buat tiket hanya dari halaman ini.
          </p>
        </div>
        <CreateTicketDialog
          trigger={
            <Button size="lg" className="w-full shrink-0 sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Create Ticket
            </Button>
          }
        />
      </div>

      <TicketFilters onFilterChange={handleFilterChange} />

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h3 className="font-semibold text-destructive mb-2">Error Memuat Tickets</h3>
          <p className="text-sm text-muted-foreground">
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              'Terjadi kesalahan saat memuat daftar tickets'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Status: {(error as any)?.response?.status || 'Unknown'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Periksa console browser (F12) untuk detail error
          </p>
        </div>
      )}

      <TicketList
        tickets={filteredTickets}
        isLoading={isLoading}
      />

      {/* Pagination Controls */}
      {!isLoading && totalTickets > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages} ({totalTickets} tickets)
            {isFetching && !isLoading && (
              <span className="ml-2 text-primary">Memperbarui...</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!hasPrevPage || isFetching}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNextPage || isFetching}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
