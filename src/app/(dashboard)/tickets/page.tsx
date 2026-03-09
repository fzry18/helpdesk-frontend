"use client"

import { useState, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/store/authStore"
import { TicketList } from "@/components/helpdesk/tickets/TicketList"
import { TicketFilters, type TicketFilterValues } from "@/components/helpdesk/tickets/TicketFilters"
import { CreateTicketDialog } from "@/components/helpdesk/tickets/create/CreateTicketDialog"
import { Button } from "@/components/ui/button"
import { Plus, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react"
import { useTicketList } from "@/hooks/use-ticket-queries"
import { useTicketWebSocket } from "@/hooks/use-ticket-websocket"
import type { Ticket } from "@/types"

const PAGE_SIZE = 20

function getTicketStatusGroup(ticket: Ticket): "Open" | "In Progress" | "Closed" | "Rejected" {
  // Pastikan ticket yang ditolak tidak ikut dihitung sebagai Closed
  if (ticket.is_rejected) return "Rejected"
  const name = ((ticket.stage?.actual_name ?? ticket.stage?.name) ?? "").toString().toLowerCase()
  if (name.includes("closed") || name.includes("selesai") || ticket.resolution_confirmed === true) return "Closed"
  if (name.includes("progress") || name.includes("in progress") || name.includes("awaiting") || name.includes("confirmation") || name.includes("menunggu")) return "In Progress"
  return "Open"
}

function isTicketDraft(ticket: Ticket): boolean {
  const name = ((ticket.stage?.actual_name ?? ticket.stage?.name) ?? "").toString().toLowerCase()
  return name.includes("draft") || name.includes("new") || name.includes("baru")
}

export default function TicketsPage() {
  const helpdeskRole = useAuthStore((s) => s.getHelpdeskRole())
  const searchParams = useSearchParams()
  const urlStatus = searchParams?.get("status") ?? null
  const createdToday = searchParams?.get("created_today") ?? null
  
  // Detect filtered view mode
  const isFilteredView = !!(urlStatus || createdToday)
  
  // Get filter label for subtitle
  const getFilterLabel = () => {
    if (createdToday === "true") return "Tiket Hari Ini"
    if (urlStatus === "draft") return "Draft"
    if (urlStatus === "in_progress") return "In Progress"
    if (urlStatus === "closed") return "Tiket Selesai"
    if (urlStatus === "rejected") return "Ditolak"
    return null
  }
  const filterLabel = getFilterLabel()
  
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<TicketFilterValues>(() => ({
    status: (urlStatus as TicketFilterValues["status"]) || "all",
  }))

  // Map frontend status filter to API status parameter
  const apiStatus = useMemo(() => {
    if (filters.status === "open") return "open"
    if (filters.status === "draft") return "open" // Backend doesn't have draft, filter client-side
    if (filters.status === "in_progress") return "open" // Backend doesn't have in_progress, filter client-side
    if (filters.status === "closed") return "closed"
    if (filters.status === "rejected") return "closed" // rejected = subset dari closed, filter di FE
    return "all"
  }, [filters.status])

  // Fetch tickets with pagination (hanya user yang pakai my_tickets; admin/dept_admin backend filter)
  const { data, isLoading, error, isFetching } = useTicketList({
    page,
    limit: PAGE_SIZE,
    status: apiStatus,
    priority: filters.priority,
    ticket_category_type: filters.ticket_category_type,
    my_tickets: helpdeskRole === "user",
  })

  // WebSocket untuk real-time updates
  useTicketWebSocket({ enabled: true })

  // Filter tickets client-side untuk in_progress, draft, dan created_today
  const filteredTickets = useMemo(() => {
    const raw = data?.data
    let list: Ticket[] | null = null
    if (Array.isArray(raw)) list = raw
    else if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: Ticket[] }).data))
      list = (raw as { data: Ticket[] }).data
    if (!list) return null
    
    // Filter by created_today
    if (createdToday === "true") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return list.filter((t) => {
        const createdAt = new Date(t.create_date || "")
        createdAt.setHours(0, 0, 0, 0)
        return createdAt.getTime() === today.getTime()
      })
    }
    
    // Filter draft tickets
    if (filters.status === "draft") {
      return list.filter((t) => isTicketDraft(t))
    }
    // Only filter in_progress on client side since backend may not support it directly
    if (filters.status === "in_progress") {
      return list.filter((t) => getTicketStatusGroup(t) === "In Progress" && !isTicketDraft(t))
    }
    if (filters.status === "open") {
      return list.filter((t) => getTicketStatusGroup(t) === "Open")
    }
    if (filters.status === "closed") {
      return list.filter((t) => getTicketStatusGroup(t) === "Closed")
    }
    if (filters.status === "rejected") {
      return list.filter((t) => getTicketStatusGroup(t) === "Rejected")
    }
    return list
  }, [data?.data, filters.status, createdToday])

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
      {/* Back to Dashboard link when in filtered view */}
      {isFilteredView && (
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Kembali ke Dashboard
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">Tickets</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {isFilteredView && filterLabel 
              ? `Menampilkan tiket: ${filterLabel}`
              : "Kelola tiket helpdesk. Buat tiket hanya dari halaman ini."
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isFilteredView && (
            <CreateTicketDialog
              trigger={
                <Button size="lg" className="w-full shrink-0 sm:w-auto">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Ticket
                </Button>
              }
            />
          )}
        </div>
      </div>

      <TicketFilters onFilterChange={handleFilterChange} initialStatus={urlStatus as TicketFilterValues["status"]} />

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
