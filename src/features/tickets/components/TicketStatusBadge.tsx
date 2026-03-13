/**
 * TicketStatusBadge.tsx — Feature: Tickets / Components
 *
 * Badge kecil yang menampilkan status/stage tiket.
 * variant="pill" → rounded-full (default)
 * variant="tag"  → rounded-md (untuk tabel compact)
 */

import { cn } from "@/lib/utils/cn"
import { getStatusConfig } from "@/features/tickets/constants/ticket-status"
import type { Ticket } from "@/types"

interface TicketStatusBadgeProps {
  ticket: Pick<Ticket, "stage" | "stage_name" | "is_rejected" | "waiting_user_confirmation">
  variant?: "pill" | "tag"
  showIcon?: boolean
  className?: string
}

export function TicketStatusBadge({
  ticket,
  variant = "pill",
  showIcon = false,
  className,
}: TicketStatusBadgeProps) {
  // Prioritas: rejected > waiting > stage name
  let stageName: string | null | undefined

  if (ticket.is_rejected) {
    stageName = "rejected"
  } else if (ticket.waiting_user_confirmation) {
    stageName = "waiting confirmation"
  } else {
    stageName = ticket.stage?.name ?? ticket.stage_name
  }

  const config = getStatusConfig(stageName)
  const tag = variant === "pill" ? "rounded-full" : "rounded-md"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium",
        tag,
        config.className,
        className,
      )}
    >
      {showIcon && <span aria-hidden>{config.icon}</span>}
      {config.label}
    </span>
  )
}
