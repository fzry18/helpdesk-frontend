"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ticketAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/store/authStore"
import { TicketList } from "@/components/helpdesk/tickets/TicketList"
import { TicketFilters, type TicketFilterValues } from "@/components/helpdesk/tickets/TicketFilters"
import { CreateTicketDialog } from "@/components/helpdesk/tickets/CreateTicketDialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Ticket } from "@/types"

function getTicketStatusGroup(ticket: Ticket): "Open" | "In Progress" | "Closed" {
  const name = ((ticket.stage?.actual_name ?? ticket.stage?.name) ?? "").toString().toLowerCase()
  if (name.includes("closed") || name.includes("selesai") || ticket.resolution_confirmed === true) return "Closed"
  if (name.includes("progress") || name.includes("in progress") || name.includes("awaiting") || name.includes("confirmation") || name.includes("menunggu")) return "In Progress"
  return "Open"
}

export default function TicketsPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const [filters, setFilters] = useState<TicketFilterValues>({
    status: "all",
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", "list", filters.priority, filters.ticket_category_type, isAdmin],
    queryFn: () =>
      ticketAPI.list({
        status: "all",
        priority: filters.priority,
        ticket_category_type: filters.ticket_category_type,
        my_tickets: !isAdmin,
      }),
  })

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

      <TicketFilters onFilterChange={setFilters} />

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
        tickets={useMemo(() => {
          const raw = data?.data
          let list: Ticket[] | null = null
          if (Array.isArray(raw)) list = raw
          else if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: Ticket[] }).data))
            list = (raw as { data: Ticket[] }).data
          if (!list) return null
          if (filters.status === "open") return list.filter((t) => getTicketStatusGroup(t) === "Open")
          if (filters.status === "in_progress") return list.filter((t) => getTicketStatusGroup(t) === "In Progress")
          if (filters.status === "closed") return list.filter((t) => getTicketStatusGroup(t) === "Closed")
          return list
        }, [data?.data, filters.status])}
        isLoading={isLoading}
      />

      {data?.meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {data.meta.page} dari {data.meta.total_pages} ({data.meta.total} tickets)
          </p>
        </div>
      )}
    </div>
  )
}
