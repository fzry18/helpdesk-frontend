"use client"

import { useState } from "react"
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
import { Plus } from "lucide-react"
import type { Ticket } from "@/types"

export default function DashboardPage() {
  const { isManager, hasRole } = useAuthStore()
  const isSuperAdmin = hasRole("SUPER_ADMIN")
  const isAdminIt = hasRole("ADMIN_IT_SUPPORT")
  const isTechnician = hasRole("IT_SUPPORT")
  const isAdmin = isManager() || isSuperAdmin || isAdminIt || isTechnician

  const [trendDays, setTrendDays] = useState<number>(30)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats", trendDays],
    queryFn: () => dashboardAPI.getStats({ days: trendDays }),
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
    (ticket) =>
      (ticket.priority === "3" || ticket.priority === "4") &&
      ticket.status !== "closed" &&
      !ticket.resolution_confirmed
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isAdmin
              ? "Ringkasan operasional penanganan kendala dan performa tiket IT"
              : "Pantau status perbaikan kendala dan riwayat tiket Anda"}
          </p>
        </div>
        <CreateTicketDialog
          trigger={
            <Button size="default" className="gap-2 shadow-sm shrink-0">
              <Plus className="h-4 w-4" />
              Buat Tiket Baru
            </Button>
          }
        />
      </div>

      {/* Top Stat Cards (Personal for User, Operational for Admin) */}
      <DashboardStats
        stats={statsData?.data || null}
        isAdmin={isAdmin}
        isLoading={statsLoading}
      />

      {/* Admin Analytics Sections */}
      {isAdmin && (
        <>
          {/* Charts Row: Real Trend + Real Priority Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TicketTrendChart
              data={statsData?.data?.trend || []}
              days={trendDays}
              onDaysChange={setTrendDays}
              isLoading={statsLoading}
            />
            <PriorityDistribution
              data={statsData?.data?.priority_distribution || []}
              isLoading={statsLoading}
            />
          </div>

          {/* Activity & Urgent Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <UrgentTicketsSection
              tickets={urgentTickets}
              isLoading={ticketsLoading}
            />
            <ActivityTimeline
              activities={statsData?.data?.activities || []}
              isLoading={statsLoading}
            />
          </div>
        </>
      )}

      <div className="w-full">
        <RecentTickets
          tickets={recentTicketsList}
          isLoading={ticketsLoading}
        />
      </div>
    </div>
  )
}
