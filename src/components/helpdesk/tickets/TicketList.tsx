"use client"

import { TicketCard } from "./TicketCard"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Inbox } from "lucide-react"
import type { Ticket } from "@/types"

interface TicketListProps {
  tickets: Ticket[] | null
  isLoading: boolean
}

export function TicketList({ tickets, isLoading }: TicketListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Tidak ada tiket ditemukan"
        description="Coba ubah filter atau buat tiket baru"
      />
    )
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  )
}
