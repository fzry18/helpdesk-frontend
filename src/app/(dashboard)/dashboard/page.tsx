"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardAPI, ticketAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/store/authStore"
import { DashboardStats } from "@/components/helpdesk/dashboard/DashboardStats"
import { RecentTickets } from "@/components/helpdesk/dashboard/RecentTickets"
import { TicketTrendChart } from "@/components/helpdesk/dashboard/TicketTrendChart"
import { PriorityDistribution } from "@/components/helpdesk/dashboard/PriorityDistribution"
import { UrgentTicketsSection } from "@/components/helpdesk/dashboard/UrgentTicketsSection"
import { ActivityTimeline } from "@/components/helpdesk/dashboard/ActivityTimeline"
import { CreateTicketDialog } from "@/components/helpdesk/tickets/CreateTicketDialog"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import type { Ticket } from "@/types"

export default function DashboardPage() {
  const isAdmin = useAuthStore((s) => s.isManager())

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardAPI.getStats(),
    enabled: isAdmin, // Full dashboard stats untuk admin saja
  })

  const { data: recentTicketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ["dashboard", "recent-tickets", isAdmin],
    queryFn: () =>
      isAdmin
        ? ticketAPI.list({ limit: 10, page: 1 })
        : ticketAPI.list({ limit: 10, page: 1, my_tickets: true }),
  })

  const recentTicketsList: Ticket[] = Array.isArray(recentTicketsData?.data)
    ? recentTicketsData.data
    : []
  const urgentTickets = recentTicketsList.filter(
    (ticket) => ticket.priority === "3" || ticket.priority === "4"
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Ringkasan aktivitas helpdesk dan statistik ticket"
              : "Tiket Anda dan status terbaru"}
          </p>
        </div>
        <CreateTicketDialog
          trigger={
            <Button size="lg">
              <BarChart3 className="mr-2 h-5 w-5" />
              Buat Tiket Baru
            </Button>
          }
        />
      </div>

      {isAdmin && (
        <DashboardStats
          stats={statsData?.data || null}
          isLoading={statsLoading}
        />
      )}

      {isAdmin && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <TicketTrendChart isLoading={false} />
            <PriorityDistribution isLoading={false} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <UrgentTicketsSection
              tickets={urgentTickets}
              isLoading={ticketsLoading}
            />
            <ActivityTimeline isLoading={false} />
          </div>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <RecentTickets
          tickets={recentTicketsList.length > 0 ? recentTicketsList : null}
          isLoading={ticketsLoading}
        />
      </div>
    </div>
  )
}
