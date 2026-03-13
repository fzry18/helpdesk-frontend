/**
 * TicketPriorityBadge.tsx — Feature: Tickets / Components
 *
 * Badge small yang menampilkan priority tiket dengan bintang dan label.
 */

import { cn } from "@/lib/utils/cn"
import { getPriorityConfig } from "@/features/tickets/constants/ticket-status"
import type { Ticket } from "@/types"

interface TicketPriorityBadgeProps {
  ticket: Pick<Ticket, "priority" | "priority_label">
  showStars?: boolean
  /** "label" = teks saja | "stars" = bintang saja | "both" = keduanya */
  display?: "label" | "stars" | "both"
  className?: string
}

export function TicketPriorityBadge({
  ticket,
  display = "both",
  className,
}: TicketPriorityBadgeProps) {
  const config = getPriorityConfig(ticket.priority)
  const stars = "★".repeat(config.stars) + "☆".repeat(4 - config.stars)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {(display === "stars" || display === "both") && (
        <span className="font-mono tracking-tight text-[10px]" aria-hidden>
          {stars}
        </span>
      )}
      {(display === "label" || display === "both") && (
        <span>{ticket.priority_label ?? config.label}</span>
      )}
    </span>
  )
}
