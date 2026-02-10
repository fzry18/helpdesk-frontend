"use client"

import React, { useCallback } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatRelativeTime } from "@/lib/utils"
import type { Ticket } from "@/types"
import { Clock, User, Tag, MessageSquare, Paperclip } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useInView } from 'react-intersection-observer'
import { usePrefetchTicket } from "@/hooks/use-ticket-queries"

interface TicketCardProps {
  ticket: Ticket
  index?: number
}

// Priority config sesuai dengan Odoo: 0=Very Low, 1=Low, 2=Normal, 3=High, 4=Very High
const getPriorityConfig = (priority: string | undefined | null) => {
  const value = priority ?? "2"
  switch (value) {
    case "4":
      return {
        color: "bg-red-100 text-red-700 border-red-300",
        dot: "bg-red-500",
        label: "Very High",
      }
    case "3":
      return {
        color: "bg-orange-100 text-orange-700 border-orange-300",
        dot: "bg-orange-500",
        label: "High",
      }
    case "2":
      return {
        color: "bg-yellow-50 text-yellow-700 border-yellow-300",
        dot: "bg-yellow-400",
        label: "Normal",
      }
    case "1":
      return {
        color: "bg-green-50 text-green-700 border-green-300",
        dot: "bg-green-400",
        label: "Low",
      }
    case "0":
      return {
        color: "bg-gray-100 text-gray-600 border-gray-300",
        dot: "bg-gray-400",
        label: "Very Low",
      }
    default:
      return {
        color: "bg-yellow-50 text-yellow-700 border-yellow-300",
        dot: "bg-yellow-400",
        label: "Normal",
      }
  }
}

// Helper untuk mendapatkan label sistem
const getSystemLabel = (systemCategory: string | null | undefined): string => {
  switch (systemCategory) {
    case "odoo":
      return "Odoo ERP"
    case "p2h":
      return "Web P2H"
    case "job_portal":
      return "Job Portal"
    case "other":
      return "Sistem Lainnya"
    default:
      return ""
  }
}

// Helper untuk warna sistem badge
const getSystemBadgeStyle = (systemCategory: string | null | undefined): string => {
  switch (systemCategory) {
    case "odoo":
      return "bg-purple-100 text-purple-700 border-purple-300"
    case "p2h":
      return "bg-blue-100 text-blue-700 border-blue-300"
    case "job_portal":
      return "bg-teal-100 text-teal-700 border-teal-300"
    case "other":
      return "bg-gray-100 text-gray-700 border-gray-300"
    default:
      return "bg-gray-100 text-gray-600 border-gray-200"
  }
}

const getStageConfig = (stage: string | undefined) => {
  const stageLower = stage?.toLowerCase() || ""
  // Sent/Draft - Blue (new tickets)
  if (stageLower.includes("new") || stageLower.includes("baru") || stageLower === "sent" || stageLower === "draft") {
    return "bg-blue-500 text-white border-blue-600"
  }
  // In Progress - Amber/Yellow
  if (stageLower.includes("progress") || stageLower.includes("proses")) {
    return "bg-amber-500 text-white border-amber-600"
  }
  // Pending/Waiting - Orange
  if (stageLower.includes("pending") || stageLower.includes("tunggu") || stageLower.includes("awaiting") || stageLower.includes("menunggu")) {
    return "bg-orange-500 text-white border-orange-600"
  }
  // Resolved - Light Green
  if (stageLower.includes("resolved") || stageLower.includes("selesai")) {
    return "bg-emerald-500 text-white border-emerald-600"
  }
  // Closed - Green
  if (stageLower.includes("closed") || stageLower.includes("tutup")) {
    return "bg-green-600 text-white border-green-700"
  }
  // Rejected - Red
  if (stageLower.includes("reject") || stageLower.includes("tolak")) {
    return "bg-red-600 text-white border-red-700"
  }
  return "bg-gray-500 text-white border-gray-600"
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const TicketCardComponent = ({ ticket, index = 0 }: TicketCardProps) => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true,
  })

  // Prefetch ticket detail on hover for faster navigation
  const prefetchTicket = usePrefetchTicket()
  const handlePrefetch = useCallback(() => {
    prefetchTicket(ticket.id)
  }, [prefetchTicket, ticket.id])

  const priorityConfig = getPriorityConfig(ticket.priority)
  
  // Get stage name - handle all possible cases
  // Backend should return stage.name = "Sent" for users when stage is Draft or missing
  const stageName = (() => {
    // Check stage object first
    if (ticket.stage && typeof ticket.stage === "object" && ticket.stage.name) {
      return ticket.stage.name
    }
    // Fallback to stage_name
    if (ticket.stage_name) {
      return ticket.stage_name
    }
    // If stage is a string directly
    if (typeof ticket.stage === "string" && ticket.stage) {
      return ticket.stage
    }
    // Final fallback - "Sent" for user-created tickets
    return "Sent"
  })()
  
  // Override stage name if rejected
  const displayStageName = ticket.is_rejected ? "Ditolak" : stageName
  const stageColor = ticket.is_rejected 
    ? "bg-red-600 text-white border-red-700" 
    : getStageConfig(stageName)

  // Show skeleton if not in view
  if (!inView) {
    return (
      <div ref={ref} className="h-[200px] animate-pulse bg-gray-100 rounded-lg">
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} onMouseEnter={handlePrefetch}>
      <Link href={`/tickets/${ticket.id}`}>
        <Card className={cn(
          "group relative overflow-hidden transition-all duration-200",
          "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
          "border-l-4",
          priorityConfig.dot.replace("bg-", "border-l-")
        )}>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                <h3 className="font-semibold text-base sm:text-lg line-clamp-2 sm:line-clamp-1 group-hover:text-primary transition-colors break-words">
                  {ticket.subject}
                </h3>
                <p className="text-xs text-muted-foreground">
                  #{ticket.ticket_number}
                </p>
              </div>
              <Badge variant="outline" className={cn("whitespace-nowrap text-xs sm:text-sm shrink-0", priorityConfig.color)}>
                {ticket.priority_label || priorityConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-4">
            {ticket.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {ticket.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Avatar className="h-5 w-5 sm:h-6 sm:w-6 text-xs">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(
                    ticket.customer?.name || ticket.customer_name || ticket.created_by?.name || "U"
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">
                {ticket.customer?.name || ticket.customer_name || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(ticket.create_date)}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Status Badge - More prominent */}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs sm:text-sm font-semibold px-2 py-0.5 sm:px-3 sm:py-1",
                    stageColor
                  )}
                >
                  {displayStageName}
                </Badge>
                {/* Ticket Type Badge - dengan detail sistem jika ada */}
                {ticket.ticket_category_type && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs font-medium px-2 py-0.5",
                      ticket.ticket_category_type === "helper" 
                        ? "bg-purple-50 text-purple-700 border-purple-200" 
                        : "bg-cyan-50 text-cyan-700 border-cyan-200"
                    )}
                  >
                    {ticket.ticket_category_type === "helper" 
                      ? "Helper" 
                      : ticket.system_category 
                        ? `System - ${getSystemLabel(ticket.system_category)}`
                        : "System"
                    }
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                {(ticket.team?.name || ticket.team_name) && (
                  <div className="flex items-center gap-1 truncate max-w-[80px] sm:max-w-none">
                    <Tag className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ticket.team?.name || ticket.team_name}</span>
                  </div>
                )}
                {(ticket.assigned_employee?.name || ticket.assigned_user?.name || ticket.assigned_user_name) && (
                  <div className="flex items-center gap-1 truncate max-w-[80px] sm:max-w-none">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ticket.assigned_employee?.name ?? ticket.assigned_user?.name ?? ticket.assigned_user_name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export const TicketCard = React.memo(TicketCardComponent)
