"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatRelativeTime } from "@/lib/utils"
import type { Ticket } from "@/types"
import { Clock, User, Tag, MessageSquare, Paperclip, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ExtendedTicket extends Ticket {
  attachment_count?: number
  message_count?: number
  waiting_user_confirmation?: boolean
}

interface TicketCardProps {
  ticket: ExtendedTicket
}

const getPriorityConfig = (priority: string | boolean | undefined | null) => {
  const value = typeof priority === "string" ? priority : typeof priority === "number" ? String(priority) : ""
  switch (value) {
    case "4":
      return {
        color: "bg-red-100 text-red-800 border-red-200",
        dot: "bg-red-500",
        label: "Mendesak",
      }
    case "3":
      return {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        dot: "bg-orange-500",
        label: "Tinggi",
      }
    case "2":
      return {
        color: "bg-amber-100 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
        label: "Sedang",
      }
    case "1":
      return {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        dot: "bg-yellow-500",
        label: "Rendah",
      }
    default:
      return {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        dot: "bg-gray-500",
        label: "Normal",
      }
  }
}

const getStageConfig = (stage: string | undefined) => {
  const stageLower = stage?.toLowerCase() || ""
  if (stageLower.includes("new") || stageLower.includes("baru")) {
    return "bg-slate-100 text-slate-700 border-slate-200"
  }
  if (stageLower.includes("progress") || stageLower.includes("proses")) {
    return "bg-sky-100 text-sky-700 border-sky-200"
  }
  if (stageLower.includes("pending") || stageLower.includes("tunggu")) {
    return "bg-amber-100 text-amber-700 border-amber-200"
  }
  if (stageLower.includes("resolved") || stageLower.includes("selesai")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-300"
  }
  if (stageLower.includes("closed") || stageLower.includes("tutup")) {
    return "bg-gray-200 text-gray-800 border-gray-300"
  }
  return "bg-gray-100 text-gray-700 border-gray-200"
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function TicketCard({ ticket }: TicketCardProps) {
  const priorityConfig = getPriorityConfig(ticket.priority)
  const stageName = typeof ticket.stage === "string"
    ? ticket.stage
    : ticket.stage?.name || ticket.stage_name || "Tahap Awal"
  const stageColor = getStageConfig(stageName)

  const isClosed =
    ticket.status === "closed" ||
    ticket.resolution_confirmed ||
    stageName.toLowerCase().includes("closed")

  // Duration alert
  const createdDate = new Date(ticket.create_date)
  const hoursSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60))
  const isOver24Hours = !isClosed && hoursSinceCreation >= 24

  const isUnassigned =
    !ticket.assigned_user?.name && !ticket.assigned_user_name && !isClosed

  return (
    <Link href={`/tickets/${ticket.id}`}>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        "border-l-4",
        priorityConfig.dot.replace("bg-", "border-l-")
      )}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                  {ticket.subject}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                #{ticket.ticket_number || ticket.id}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isOver24Hours && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 gap-1">
                  <Clock className="h-3 w-3 text-amber-600" />
                  {hoursSinceCreation}j
                </Badge>
              )}
              <Badge variant="outline" className={cn("text-xs whitespace-nowrap", priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {ticket.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {ticket.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5 text-[9px]">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(
                  ticket.customer?.name || ticket.customer_name || ticket.created_by?.name || "U"
                )}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">
              {ticket.customer?.name || ticket.customer_name || "Karyawan"}
            </span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(ticket.create_date)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className={cn("text-[11px] font-medium", stageColor)}>
                {stageName}
              </Badge>
              {isUnassigned ? (
                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-800 border-orange-200">
                  Belum Ditugaskan
                </Badge>
              ) : (
                ticket.assigned_user?.name || ticket.assigned_user_name ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3 text-primary" />
                    {ticket.assigned_user?.name || ticket.assigned_user_name}
                  </span>
                ) : null
              )}
              {ticket.waiting_user_confirmation && !isClosed && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                  Perlu Konfirmasi
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
              {ticket.attachment_count !== undefined && ticket.attachment_count > 0 && (
                <div className="flex items-center gap-1" title={`${ticket.attachment_count} lampiran berkas`}>
                  <Paperclip className="h-3 w-3" />
                  {ticket.attachment_count}
                </div>
              )}
              {ticket.message_count !== undefined && ticket.message_count > 0 && (
                <div className="flex items-center gap-1" title={`${ticket.message_count} obrolan`}>
                  <MessageSquare className="h-3 w-3" />
                  {ticket.message_count}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
