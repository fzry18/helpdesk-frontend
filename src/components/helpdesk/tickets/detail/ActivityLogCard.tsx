"use client"

import { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardList } from "lucide-react"
import { formatDate } from "@/lib/utils"
import {
  messageToPlainText,
  formatActivityBody,
  getActivityIcon,
} from "@/lib/utils/ticket-helpers"
import type { Ticket } from "@/types"
import type { MessageItemData } from "./MessageItem"

interface ActivityLogCardProps {
  activityLogs: MessageItemData[]
  messagesLoading: boolean
  ticket: Ticket
}

export function ActivityLogCard({
  activityLogs,
  messagesLoading,
  ticket,
}: ActivityLogCardProps) {
  const activityEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activityLogs.length])

  const getActivityBadgeColor = (label: string | null): string => {
    if (!label) return "bg-gray-100 text-gray-700 border-gray-200"
    if (label.includes("Progress")) return "bg-blue-100 text-blue-800 border-blue-200"
    if (label.includes("Diproses")) return "bg-green-100 text-green-800 border-green-200"
    if (label.includes("Team"))     return "bg-purple-100 text-purple-800 border-purple-200"
    if (label.includes("Member"))   return "bg-indigo-100 text-indigo-800 border-indigo-200"
    if (label.includes("Selesai"))  return "bg-emerald-100 text-emerald-800 border-emerald-200"
    if (label.includes("Catatan"))  return "bg-amber-100 text-amber-800 border-amber-200"
    if (label.includes("Konfirmasi")) return "bg-orange-100 text-orange-800 border-orange-200"
    return "bg-gray-100 text-gray-700 border-gray-200"
  }

  return (
    <Card>
      <CardHeader className="pb-3 bg-blue-50/50 rounded-t-lg">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          On Progress
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Riwayat progress pengerjaan
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[280px] overflow-y-auto">
          {messagesLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : activityLogs.length > 0 ? (
            <div className="divide-y divide-border/60">
              {activityLogs.map((log) => {
                const bodyRaw = log.body_plain ?? log.body ?? ""
                const { label, content } = formatActivityBody(bodyRaw)
                const icon = getActivityIcon(label)
                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {log.author?.name ?? "System"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(log.date ?? log.create_date ?? "")}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 mt-2">
                      <span className="text-base shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        {label && (
                          <Badge
                            variant="secondary"
                            className={`mb-1 text-xs font-medium ${getActivityBadgeColor(label)}`}
                          >
                            {label}
                          </Badge>
                        )}
                        {(content || !label) && (
                          <p
                            className={`text-sm ${
                              label ? "text-foreground" : "text-muted-foreground"
                            } break-words`}
                          >
                            {content || messageToPlainText(bodyRaw) || "—"}
                          </p>
                        )}

                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Belum ada aktivitas
            </p>
          )}
          <div ref={activityEndRef} />
        </div>
      </CardContent>
    </Card>
  )
}
