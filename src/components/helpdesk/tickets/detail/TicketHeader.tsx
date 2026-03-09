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
                  Ditolak pada: {new Date(ticket.rejected_date).toLocaleDateString("id-ID", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner Ticket Selesai */}
      {!ticket.is_rejected && (
        ticket.stage?.name?.toLowerCase().includes("closed") || ticket.resolution_confirmed
      ) && (() => {
        // Hitung durasi penyelesaian
        const startDate = ticket.start_date ? new Date(ticket.start_date) : new Date(ticket.create_date)
        const endDate = ticket.end_date ? new Date(ticket.end_date) : (ticket.write_date ? new Date(ticket.write_date) : null)
        
        let durationDays = null
        if (endDate) {
          const diffTime = endDate.getTime() - startDate.getTime()
          durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        return (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-lg">✓</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Ticket Selesai</h3>
                <p className="text-xs text-green-600 mt-1">
                  Diselesaikan pada:{" "}
                  {endDate
                    ? endDate.toLocaleDateString("id-ID", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })
                    : "-"
                  }
                </p>
                {durationDays !== null && (
                  <span className="block text-xs font-medium text-green-700 mt-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Diselesaikan dalam {durationDays} {durationDays === 1 ? "hari" : "hari"}
                    </Badge>
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
