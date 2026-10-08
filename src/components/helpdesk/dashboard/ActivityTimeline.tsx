"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TicketPlus,
  UserCheck,
  CheckCircle2,
  MessageSquare,
  Activity,
  Lock,
} from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import Link from "next/link"

export interface ActivityItem {
  id: string | number
  type: "ticket_created" | "ticket_assigned" | "ticket_closed" | "comment_added" | "internal_note"
  user: string
  description: string
  timestamp: string
  ticketId?: number
  ticketNumber?: string
}

interface ActivityTimelineProps {
  activities?: ActivityItem[]
  isLoading?: boolean
}

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "ticket_created":
      return <TicketPlus className="h-3.5 w-3.5" />
    case "ticket_assigned":
      return <UserCheck className="h-3.5 w-3.5" />
    case "ticket_closed":
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case "comment_added":
      return <MessageSquare className="h-3.5 w-3.5" />
    case "internal_note":
      return <Lock className="h-3.5 w-3.5" />
    default:
      return <Activity className="h-3.5 w-3.5" />
  }
}

const getActivityColor = (type: ActivityItem["type"]) => {
  switch (type) {
    case "ticket_created":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200"
    case "ticket_assigned":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
    case "ticket_closed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
    case "comment_added":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200"
    case "internal_note":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

export function ActivityTimeline({
  activities = [],
  isLoading = false,
}: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Aktivitas Terbaru
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Riwayat interaksi dan mutasi tiket riil
        </p>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Belum ada catatan aktivitas terbaru saat ini.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div
                key={activity.id || index}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div
                  className={`rounded-full p-1.5 border shrink-0 mt-0.5 ${getActivityColor(
                    activity.type
                  )}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug">
                    <span className="font-semibold text-foreground">
                      {activity.user}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {activity.description.replace(/#[A-Za-z0-9-]+/, "")}
                    </span>
                    {activity.ticketId && activity.ticketNumber && (
                      <Link
                        href={`/tickets/${activity.ticketId}`}
                        className="font-medium text-primary hover:underline ml-1 inline-flex items-center gap-0.5"
                      >
                        #{activity.ticketNumber}
                      </Link>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
