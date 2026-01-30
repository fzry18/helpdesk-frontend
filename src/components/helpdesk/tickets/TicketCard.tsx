"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatRelativeTime } from "@/lib/utils"
import type { Ticket } from "@/types"
import { Clock, User, Tag, MessageSquare, Paperclip } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface TicketCardProps {
  ticket: Ticket
}

const getPriorityConfig = (priority: string | boolean | undefined | null) => {
  const value = typeof priority === "string" ? priority : typeof priority === "number" ? String(priority) : ""
  switch (value) {
    case "4":
      return {
        color: "bg-red-100 text-red-800 border-red-200",
        dot: "bg-red-500",
        label: "Very High",
      }
    case "3":
      return {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        dot: "bg-orange-500",
        label: "High",
      }
    case "2":
      return {
        color: "bg-amber-100 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
        label: "Medium",
      }
    case "1":
      return {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        dot: "bg-yellow-500",
        label: "Low",
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
    return "bg-gray-100 text-gray-700 border-gray-200"
  }
  if (stageLower.includes("progress") || stageLower.includes("proses")) {
    return "bg-blue-100 text-blue-700 border-blue-200"
  }
  if (stageLower.includes("pending") || stageLower.includes("tunggu")) {
    return "bg-amber-100 text-amber-700 border-amber-200"
  }
  if (stageLower.includes("resolved") || stageLower.includes("selesai")) {
    return "bg-green-100 text-green-700 border-green-200"
  }
  if (stageLower.includes("closed") || stageLower.includes("tutup")) {
    return "bg-slate-100 text-slate-700 border-slate-200"
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
    : ticket.stage?.name || ticket.stage_name || "Unknown"
  const stageColor = getStageConfig(stageName)

  return (
    <Link href={`/tickets/${ticket.id}`}>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
        "border-l-4",
        priorityConfig.dot.replace("bg-", "border-l-")
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {ticket.subject}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                #{ticket.ticket_number}
              </p>
            </div>
            <Badge variant="outline" className={cn("whitespace-nowrap", priorityConfig.color)}>
              {ticket.priority_label || priorityConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ticket.description}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Avatar className="h-6 w-6 text-xs">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials(
                  ticket.customer?.name || ticket.customer_name || ticket.created_by?.name || "U"
                )}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {ticket.customer?.name || ticket.customer_name || "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(ticket.create_date)}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("text-xs", stageColor)}>
                {stageName}
              </Badge>
              {ticket.ticket_category_type && (
                <Badge variant="outline" className="text-xs">
                  {ticket.ticket_category_type === "helper" ? "Helper" : "System"}
                  {ticket.system_category && ` · ${ticket.system_category}`}
                </Badge>
              )}
              {ticket.waiting_user_confirmation && !ticket.resolution_confirmed && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                  Menunggu konfirmasi
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {(ticket.team?.name || ticket.team_name) && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {ticket.team?.name || ticket.team_name}
                </div>
              )}
              {(ticket.assigned_user?.name || ticket.assigned_user_name) && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ticket.assigned_user?.name || ticket.assigned_user_name}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
