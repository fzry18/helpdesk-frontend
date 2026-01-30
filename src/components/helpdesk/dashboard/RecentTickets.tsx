"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketCard } from "@/components/helpdesk/tickets/TicketCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { Ticket } from "@/types"

interface RecentTicketsProps {
  tickets: Ticket[] | null
  isLoading: boolean
}

export function RecentTickets({ tickets, isLoading }: RecentTicketsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Tidak ada ticket terbaru
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
