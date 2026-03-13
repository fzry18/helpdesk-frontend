/**
 * TicketCard.tsx — Feature: Tickets / Components
 *
 * Card view untuk satu tiket — dipakai di TicketList (mode card/grid)
 * dan sebagai item dalam Kanban board.
 *
 * Mengirimkan onSelect callback agar parent dapat navigate/open detail.
 */

import { memo, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { TicketStatusBadge } from "./TicketStatusBadge"
import { TicketPriorityBadge } from "./TicketPriorityBadge"
import { cn } from "@/lib/utils/cn"
import type { Ticket } from "@/types"

interface TicketCardProps {
  ticket: Ticket
  onSelect?: (ticket: Ticket) => void
  isSelected?: boolean
  className?: string
}

export const TicketCard = memo(function TicketCard({
  ticket,
  onSelect,
  isSelected = false,
  className,
}: TicketCardProps) {
  const handleClick = useCallback(() => {
    onSelect?.(ticket)
  }, [onSelect, ticket])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onSelect?.(ticket)
      }
    },
    [onSelect, ticket],
  )

  const createdAgo = formatDistanceToNow(new Date(ticket.create_date), {
    addSuffix: true,
    locale: localeId,
  })

  const categoryLabel = ticket.ticket_category_type === "helper" ? "Helper" : "System"

  return (
    <article
      role={onSelect ? "button" : "article"}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? handleClick : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all",
        onSelect &&
          "cursor-pointer hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isSelected && "border-primary ring-2 ring-primary ring-offset-1",
        className,
      )}
      aria-label={`Tiket ${ticket.ticket_number}: ${ticket.subject}`}
    >
      {/* Header: ticket number + kategori */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          #{ticket.ticket_number}
        </span>
        <span className="text-xs text-muted-foreground">{categoryLabel}</span>
      </div>

      {/* Subject */}
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
        {ticket.subject}
      </h3>

      {/* Description preview */}
      {ticket.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {ticket.description}
        </p>
      )}

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <TicketStatusBadge ticket={ticket} variant="tag" />
        <TicketPriorityBadge ticket={ticket} display="label" />
      </div>

      {/* Footer: assigned + date */}
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {ticket.assigned_employee?.name ?? ticket.assigned_user?.name ?? "Belum di-assign"}
        </span>
        <time dateTime={ticket.create_date} className="shrink-0">
          {createdAgo}
        </time>
      </div>

      {/* Waiting confirmation indicator */}
      {ticket.waiting_user_confirmation && !ticket.is_rejected && (
        <div className="absolute right-2 top-2 size-2 animate-pulse rounded-full bg-orange-400" />
      )}
    </article>
  )
})
