"use client"

import React, { useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketCard } from "@/components/helpdesk/tickets/TicketCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { Ticket } from "@/types"

const STATUS_ORDER: ("Open" | "In Progress" | "Closed" | "Rejected")[] = ["Open", "In Progress", "Closed", "Rejected"]
const STATUS_LABELS: Record<"Open" | "In Progress" | "Closed" | "Rejected", string> = {
  Open: "Terbuka",
  "In Progress": "In Progress",
  Closed: "Selesai",
  Rejected: "Ditolak",
}
const COLUMN_SCROLL_HEIGHT = 320
const COLUMN_MIN_WIDTH = 280

/** Group by stage/status: Open, In Progress, Closed, Rejected */
function getTicketStatusGroup(ticket: Ticket): "Open" | "In Progress" | "Closed" | "Rejected" {
  // Rejected harus dicek dulu supaya tidak ikut Closed
  if (ticket.is_rejected) return "Rejected"
  const name = ((ticket.stage?.actual_name ?? ticket.stage?.name) ?? "").toString().toLowerCase()
  if (
    name.includes("closed") ||
    name.includes("selesai") ||
    ticket.resolution_confirmed === true
  )
    return "Closed"
  if (
    name.includes("progress") ||
    name.includes("in progress") ||
    name.includes("awaiting") ||
    name.includes("confirmation") ||
    name.includes("menunggu")
  )
    return "In Progress"
  return "Open"
}

interface RecentTicketsProps {
  tickets: Ticket[] | null
  isLoading: boolean
}

const RecentTicketsComponent = ({ tickets, isLoading }: RecentTicketsProps) => {
  // Memoize expensive calculations
  const groupsByStatus = useMemo(() => {
    const groups: Record<"Open" | "In Progress" | "Closed" | "Rejected", Ticket[]> = {
      Open: [],
      "In Progress": [],
      Closed: [],
      Rejected: [],
    }
    if (tickets && tickets.length > 0) {
      const sorted = [...tickets].sort((a, b) => {
        const dateA = new Date(a.write_date || a.create_date || 0).getTime()
        const dateB = new Date(b.write_date || b.create_date || 0).getTime()
        return dateB - dateA
      })
      for (const t of sorted) {
        const group = getTicketStatusGroup(t)
        groups[group].push(t)
      }
    }
    return STATUS_ORDER.map((key) => ({ key, tickets: groups[key], label: STATUS_LABELS[key] }))
  }, [tickets])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
          <p className="text-xs text-muted-foreground">Grouped by stage/status, ordered by latest update</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[320px] shrink-0 rounded-lg animate-pulse bg-muted" style={{ minWidth: COLUMN_MIN_WIDTH }} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get color config for column header based on status
  const getColumnHeaderStyle = (status: "Open" | "In Progress" | "Closed" | "Rejected") => {
    switch (status) {
      case "Open":
        return "bg-blue-500 text-white"
      case "In Progress":
        return "bg-amber-500 text-white"
      case "Closed":
        return "bg-green-600 text-white"
      case "Rejected":
        return "bg-red-600 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Tiket Terbaru</CardTitle>
        <p className="text-xs text-muted-foreground">
          Geser ke samping untuk lihat tiap status; scroll ke bawah di dalam tiap kotak untuk daftar tiket
        </p>
      </CardHeader>
      <CardContent className="w-full min-w-0 p-0 md:p-4">
        <div className="flex w-full flex-nowrap gap-4 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth md:min-h-[360px]">
          {groupsByStatus.map(({ key, tickets: list, label }) => (
            <section
              key={key}
              className="flex min-h-0 shrink-0 flex-col rounded-lg border overflow-hidden shadow-sm"
              style={{ minWidth: COLUMN_MIN_WIDTH }}
            >
              <h3 className={`shrink-0 px-4 py-3 text-sm font-bold ${getColumnHeaderStyle(key)}`}>
                {label} <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">{list.length}</span>
              </h3>
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 bg-muted/20"
                style={{ height: COLUMN_SCROLL_HEIGHT }}
              >
                {list.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada</p>
                ) : (
                  <div className="space-y-3">
                    {list.map((ticket) => (
                      <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Export memoized component
export const RecentTickets = React.memo(RecentTicketsComponent)
