"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatRelativeTime } from "@/lib/utils"
import type { Ticket } from "@/types"
import {
  Clock,
  User,
  Users,
  MessageSquare,
  Paperclip,
  Link2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react"
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
  const value =
    typeof priority === "string"
      ? priority
      : typeof priority === "number"
      ? String(priority)
      : ""
  switch (value) {
    case "4":
      return {
        color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
        dot: "bg-red-500",
        label: "Mendesak",
      }
    case "3":
      return {
        color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
        dot: "bg-orange-500",
        label: "Tinggi",
      }
    case "2":
      return {
        color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        dot: "bg-amber-500",
        label: "Sedang",
      }
    case "1":
      return {
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        dot: "bg-emerald-500",
        label: "Rendah",
      }
    default:
      return {
        color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
        dot: "bg-slate-400",
        label: "Normal",
      }
  }
}

const getStageConfig = (stage: string | undefined) => {
  const stageLower = stage?.toLowerCase() || ""
  if (stageLower.includes("new") || stageLower.includes("baru")) {
    return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 font-semibold"
  }
  if (stageLower.includes("progress") || stageLower.includes("proses")) {
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-semibold"
  }
  if (stageLower.includes("pending") || stageLower.includes("tunggu")) {
    return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
  }
  if (stageLower.includes("resolved") || stageLower.includes("selesai")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-semibold"
  }
  if (stageLower.includes("closed") || stageLower.includes("tutup")) {
    return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function TicketCard({ ticket }: TicketCardProps) {
  const priorityConfig = getPriorityConfig(ticket.priority)
  const stageName =
    typeof ticket.stage === "string"
      ? ticket.stage
      : ticket.stage?.name || ticket.stage_name || "Tahap Awal"
  const stageColor = getStageConfig(stageName)

  const isClosed =
    ticket.status === "closed" ||
    ticket.resolution_confirmed ||
    stageName.toLowerCase().includes("closed") ||
    stageName.toLowerCase().includes("selesai")

  const isFollowUp = Boolean(
    ticket.parent_id ||
    ticket.parent_ticket ||
    ticket.subject?.startsWith("[Follow-up")
  )

  let cleanSubject = ticket.subject
  let parentRef: string | null = null

  if (ticket.subject?.startsWith("[Follow-up")) {
    const match = ticket.subject.match(/^\[Follow-up\s+([^\]]+)\]\s*(.*)$/i)
    if (match) {
      parentRef = match[1]
      cleanSubject = match[2] || ticket.subject
    }
  } else if (ticket.parent_ticket) {
    parentRef = ticket.parent_ticket.ticket_number
  }

  const createdDate = new Date(ticket.create_date)
  const hoursSinceCreation = Math.floor(
    (Date.now() - createdDate.getTime()) / (1000 * 60 * 60)
  )
  const isOver24Hours = !isClosed && hoursSinceCreation >= 24

  const isUnassigned =
    !ticket.assigned_user?.name && !ticket.assigned_user_name && !isClosed

  return (
    <Link href={`/tickets/${ticket.id}`} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
      <Card
        className={cn(
          "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-border/70 bg-card",
          isFollowUp && "border-purple-300/80 dark:border-purple-900/60"
        )}
      >
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs">
                  #{ticket.ticket_number || ticket.id}
                </span>

                {isFollowUp && (
                  <Badge
                    variant="outline"
                    className="bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800 text-xs font-semibold gap-1 py-0.5"
                  >
                    <Link2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    <span>Tiket Terkait {parentRef ? `(${parentRef})` : ""}</span>
                  </Badge>
                )}

                {ticket.category?.name && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {ticket.category.name}
                  </Badge>
                )}

                {ticket.team?.name && (
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border gap-1">
                    <Users className="h-3 w-3 text-primary" />
                    {ticket.team.name}
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                {cleanSubject}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 sm:self-start">
              {isOver24Hours && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1 font-medium"
                >
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  {hoursSinceCreation}j
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("text-xs font-semibold whitespace-nowrap px-2 py-0.5", priorityConfig.color)}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", priorityConfig.dot)} />
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-4 sm:px-5 pb-4">
          {ticket.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {ticket.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5 text-[10px] border border-border">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(
                  ticket.customer?.name || ticket.customer_name || ticket.created_by?.name || "U"
                )}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">
              {ticket.customer?.name || ticket.customer_name || ticket.created_by?.name || "Karyawan"}
            </span>
            <span>•</span>
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(ticket.create_date)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-border/50 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-xs px-2 py-0.5", stageColor)}>
                {stageName}
              </Badge>

              {isUnassigned ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900 font-medium flex items-center gap-1"
                >
                  <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  Belum Ditugaskan
                </Badge>
              ) : ticket.assigned_user?.name || ticket.assigned_user_name ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md border border-border/50">
                  <User className="h-3 w-3 text-primary" />
                  <span className="font-medium text-foreground">
                    {ticket.assigned_user?.name || ticket.assigned_user_name}
                  </span>
                </span>
              ) : null}

              {ticket.waiting_user_confirmation && !isClosed && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-medium"
                >
                  Menunggu Konfirmasi User
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2.5">
                {ticket.attachment_count !== undefined && ticket.attachment_count > 0 && (
                  <div className="flex items-center gap-1" title={`${ticket.attachment_count} lampiran berkas`}>
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{ticket.attachment_count}</span>
                  </div>
                )}
                {ticket.message_count !== undefined && ticket.message_count > 0 && (
                  <div className="flex items-center gap-1" title={`${ticket.message_count} obrolan`}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{ticket.message_count}</span>
                  </div>
                )}
              </div>

              <span className="inline-flex items-center gap-1 text-primary font-medium group-hover:translate-x-0.5 transition-transform text-xs">
                Buka Tiket
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
