"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getPriorityConfig,
  getDisplayStageName,
  getStageColor,
  getSystemLabel,
  getSystemBadgeStyle,
} from "@/lib/utils/ticket-helpers"
import type { Ticket } from "@/types"

interface TicketHeaderProps {
  ticket: Ticket
}

export function TicketHeader({ ticket }: TicketHeaderProps) {
  const getDisplayStageNameWithRejection = (): string => {
    if (ticket.is_rejected) return "Ditolak"
    return getDisplayStageName(ticket)
  }
  const priorityConfig = getPriorityConfig(String(ticket.priority))
  const stageName = getDisplayStageNameWithRejection()

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={cn(
              "text-sm font-semibold px-3 py-1",
              getStageColor(stageName, ticket.is_rejected)
            )}
          >
            {stageName}
          </Badge>
          <Badge variant="outline" className={priorityConfig.color}>
            {ticket.priority_label ?? priorityConfig.label}
          </Badge>
        </div>
      </div>

      {ticket.is_rejected && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 text-lg">✕</span>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Ticket Ditolak</h3>
              {ticket.rejection_reason && (
                <p className="text-sm text-red-700 mt-1">
                  <strong>Alasan:</strong> {ticket.rejection_reason}
                </p>
              )}
              {ticket.rejected_date && (
                <p className="text-xs text-red-600 mt-2">
                  Ditolak pada: {new Date(ticket.rejected_date).toLocaleString("id-ID")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        {ticket.ticket_category_type === "system" && ticket.system_category && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium px-2 py-0.5 mb-2",
              getSystemBadgeStyle(ticket.system_category)
            )}
          >
            {getSystemLabel(ticket.system_category)}
          </Badge>
        )}
        <h1 className="text-xl sm:text-2xl font-bold break-words">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">#{ticket.ticket_number}</p>
      </div>
    </>
  )
}
