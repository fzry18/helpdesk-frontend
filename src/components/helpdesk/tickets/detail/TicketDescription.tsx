"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Ticket } from "@/types"

interface TicketDescriptionProps {
  ticket: Ticket
}

export function TicketDescription({ ticket }: TicketDescriptionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Deskripsi</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{ticket.description || "—"}</p>
      </CardContent>
    </Card>
  )
}

/** Odoo context card for system tickets */
export function TicketOdooContext({ ticket }: { ticket: Ticket }) {
  if (ticket.ticket_category_type !== "system" || !ticket.captured_url) return null
  return (
    <Card className="bg-blue-50/50 border-blue-100 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-blue-900">Info Sistem</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1.5">
        {ticket.captured_url && (
          <div className="flex flex-col sm:flex-row sm:items-start gap-1">
            <span className="text-muted-foreground shrink-0">URL:</span>
            <a
              href={ticket.captured_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {ticket.captured_url}
            </a>
          </div>
        )}
        {ticket.captured_module && (
          <p className="break-words">
            <span className="text-muted-foreground">Module:</span> {ticket.captured_module}
          </p>
        )}
        {ticket.captured_menu_path && (
          <p className="break-words">
            <span className="text-muted-foreground">Menu:</span> {ticket.captured_menu_path}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
