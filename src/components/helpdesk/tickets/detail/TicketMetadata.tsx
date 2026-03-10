"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Building, Users, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { getStageColor, getDisplayStageName } from "@/lib/utils/ticket-helpers"
import { useAuthStore } from "@/store/authStore"
import type { Ticket } from "@/types"

interface TicketMetadataProps {
  ticket: Ticket
  isAdminUser: boolean
}

export function TicketMetadata({ ticket, isAdminUser }: TicketMetadataProps) {
  const stageName = ticket.stage?.name ?? getDisplayStageName(ticket, isAdminUser)

  const shortDate = (date: string | null | undefined) => {
    if (!date) return "-"
    const d = new Date(date)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  const detailDate = (date: string | null | undefined) => {
    if (!date) return "-"
    const d = new Date(date)
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }) + ", pukul " + d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pemohon</p>
              <p className="font-medium">
                {ticket.customer?.name ?? ticket.customer_name ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-medium">{ticket.department_name ?? "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tim</p>
              <p className="font-medium">
                {ticket.team?.name ?? ticket.team_name ?? "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Dibuat</p>
              <p className="font-medium">{detailDate(ticket.create_date)}</p>
            </div>
          </div>
        </div>
        {(ticket.assigned_employee?.name ?? ticket.assigned_user?.name) && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <span className="text-sm">
              Ditangani oleh:{" "}
              <strong>
                {ticket.assigned_employee?.name ?? ticket.assigned_user?.name}
              </strong>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TicketMetadataSidebar({
  ticket,
}: {
  ticket: Ticket
}) {
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const stageName = ticket.stage?.name ?? getDisplayStageName(ticket, isAdmin())
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Status Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground">Status</p>
          <Badge variant="outline" className={getStageColor(stageName)}>
            {stageName}
          </Badge>
        </div>
        {ticket.team && (
          <div>
            <p className="text-muted-foreground">Tim</p>
            <p className="font-medium">{ticket.team.name}</p>
          </div>
        )}
        {(ticket.assigned_employee?.name ?? ticket.assigned_user?.name) && (
          <div>
            <p className="text-muted-foreground">Ditangani</p>
            <p className="font-medium">
              {ticket.assigned_employee?.name ?? ticket.assigned_user?.name}
            </p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Terakhir Update</p>
          <p>{formatDate(ticket.write_date)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
