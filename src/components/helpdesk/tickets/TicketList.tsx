"use client"

import { useMemo } from "react"
import { TicketCard } from "./TicketCard"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Inbox } from "lucide-react"
import type { Ticket } from "@/types"

const STATUS_ORDER: ("Open" | "In Progress" | "Closed")[] = ["Open", "In Progress", "Closed"]
const STATUS_LABELS: Record<"Open" | "In Progress" | "Closed", string> = {
  Open: "Terbuka",
  "In Progress": "In Progress",
  Closed: "Selesai",
}

/** Group by stage/status (sama dengan RecentTickets). Daftar hasil filter lalu dikelompokkan. */
function getTicketStatusGroup(ticket: Ticket): "Open" | "In Progress" | "Closed" {
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

interface TicketListProps {
  tickets: Ticket[] | null
  isLoading: boolean
}

export function TicketList({ tickets, isLoading }: TicketListProps) {
  const visibleGroups = useMemo(() => {
    if (!tickets || tickets.length === 0) return [] as Array<{ key: "Open" | "In Progress" | "Closed"; tickets: Ticket[] }>

    const groups: Record<"Open" | "In Progress" | "Closed", Ticket[]> = {
      Open: [],
      "In Progress": [],
      Closed: [],
    }
    for (const t of tickets) {
      const group = getTicketStatusGroup(t)
      groups[group].push(t)
    }

    return STATUS_ORDER.filter((key) => groups[key].length > 0).map((key) => ({
      key,
      tickets: groups[key],
    }))
  }, [tickets])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No tickets found"
        description="Change filters or create a new ticket"
      />
    )
  }

  return (
    <div className="space-y-8">
      {visibleGroups.map(({ key, tickets: list }) => (
        <section key={key} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {STATUS_LABELS[key]} ({list.length})
          </h2>
          <div className="space-y-4">
            {list.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
