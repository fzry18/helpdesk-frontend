"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ticketAPI } from "@/lib/api/endpoints"
import { TicketList } from "@/components/helpdesk/tickets/TicketList"
import { TicketFilters } from "@/components/helpdesk/tickets/TicketFilters"
import { CreateTicketDialog } from "@/components/helpdesk/tickets/CreateTicketDialog"
import { useDebounce } from "@/hooks/use-debounce"

export default function TicketsPage() {
  const [filters, setFilters] = useState<{
    search?: string
    stage_id?: number
    team_id?: number
    priority?: string
    status?: "open" | "closed" | "all"
    ticket_category_type?: "system" | "helper"
    system_category?: string
    my_tickets?: boolean
  }>({
    status: "all",
  })

  const debouncedSearch = useDebounce(filters.search || "", 500)

  console.log('=== Tickets List Page ===')
  console.log('Filters:', filters)
  console.log('Debounced search:', debouncedSearch)

  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", { ...filters, search: debouncedSearch }],
    queryFn: async () => {
      try {
        console.log('Fetching tickets with params:', {
          ...filters,
          search: debouncedSearch || undefined,
        })
        const response = await ticketAPI.list({
          ...filters,
          search: debouncedSearch || undefined,
        })
        console.log('Tickets fetched successfully:', response)
        console.log('Total tickets:', response.data?.total)
        return response
      } catch (error: any) {
        console.error('=== ERROR FETCHING TICKETS ===')
        console.error('Error type:', error.constructor.name)
        console.error('Error message:', error.message)
        console.error('Error response:', error.response)
        console.error('Error status:', error.response?.status)
        console.error('Error data:', error.response?.data)
        console.error('Full error:', error)
        throw error
      }
    },
    retry: false, // Disable retry untuk debugging
  })

  // Log error state
  if (error) {
    console.error('Tickets list error state:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">
            Kelola semua ticket helpdesk Anda
          </p>
        </div>
        <CreateTicketDialog />
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
        tickets={Array.isArray(data?.data) ? data.data : null}
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
