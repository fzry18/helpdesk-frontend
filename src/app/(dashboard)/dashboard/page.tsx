"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { dashboardAPI } from "@/lib/api/endpoints"
import { useAuthStore } from "@/store/authStore"
import { DashboardStats } from "@/components/helpdesk/dashboard/DashboardStats"
import { UserDashboardStats } from "@/components/helpdesk/dashboard/UserDashboardStats"
import { RecentTickets } from "@/components/helpdesk/dashboard/RecentTickets"
import { TicketTrendChart } from "@/components/helpdesk/dashboard/TicketTrendChart"
import { PriorityDistribution } from "@/components/helpdesk/dashboard/PriorityDistribution"
import { UrgentTicketsSection } from "@/components/helpdesk/dashboard/UrgentTicketsSection"
import { ActivityTimeline } from "@/components/helpdesk/dashboard/ActivityTimeline"
import type { Ticket } from "@/types"

const RECENT_LIMIT = 50

function normalizeRecentData(raw: unknown): Ticket[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && "tickets" in raw && Array.isArray((raw as { tickets: Ticket[] }).tickets))
    return (raw as { tickets: Ticket[] }).tickets
  return []
}

/** Ambil payload dari response API (bisa { data: payload } atau payload langsung) */
function unwrapData<T>(raw: unknown): T | null {
  if (raw == null) return null
  const obj = raw as Record<string, unknown>
  if (typeof obj === "object" && "data" in obj && obj.data != null) return obj.data as T
  return raw as T
}

function getTicketStatusGroup(t: Ticket): "Open" | "In Progress" | "Closed" {
  const name = ((t.stage?.actual_name ?? t.stage?.name) ?? "").toString().toLowerCase()
  if (name.includes("closed") || name.includes("selesai") || t.resolution_confirmed === true) return "Closed"
  if (name.includes("progress") || name.includes("in progress") || name.includes("awaiting") || name.includes("confirmation") || name.includes("menunggu")) return "In Progress"
  return "Open"
}

/** Hitung total, terbuka, in progress, selesai dari array tiket (status tepisah) */
function computeUserStatsFromTickets(tickets: Ticket[]): { total: number; open: number; inProgress: number; closed: number } {
  let open = 0, inProgress = 0, closed = 0
  for (const t of tickets) {
    const g = getTicketStatusGroup(t)
    if (g === "Open") open++
    else if (g === "In Progress") inProgress++
    else closed++
  }
  return { total: tickets.length, open, inProgress, closed }
}

export default function DashboardPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin())

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardAPI.getStats(),
    enabled: isAdmin,
  })

  const { data: myTicketsData, isLoading: myTicketsLoading } = useQuery({
    queryKey: ["dashboard", "my-tickets"],
    queryFn: () => dashboardAPI.getMyTickets(),
    enabled: !isAdmin,
  })

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ["dashboard", "recent", isAdmin],
    queryFn: () => dashboardAPI.getRecent(RECENT_LIMIT),
  })

  const recentTicketsList: Ticket[] = useMemo(
    () => normalizeRecentData(recentData?.data),
    [recentData?.data]
  )

  const urgentTickets = useMemo(
    () => recentTicketsList.filter((t) => t.priority === "3" || t.priority === "4"),
    [recentTicketsList]
  )

  const userStats = useMemo(() => {
    if (isAdmin) return null
    const raw = myTicketsData?.data
    const payload = unwrapData<{ stats?: { total: number; open: number; in_progress?: number; closed: number }; tickets?: Ticket[] }>(raw)
    
    // Use backend stats if available
    if (payload?.stats) {
      return {
        total: payload.stats.total,
        open: payload.stats.open,
        inProgress: payload.stats.in_progress ?? 0,
        closed: payload.stats.closed,
      }
    }
    
    // Fallback: calculate from tickets
    const tickets = payload && Array.isArray(payload.tickets) ? payload.tickets : []
    const sourceList = tickets.length > 0 ? tickets : recentTicketsList
    return computeUserStatsFromTickets(sourceList)
  }, [isAdmin, myTicketsData?.data, recentTicketsList])

  // For user dashboard, use their own tickets from my-tickets API
  const userTicketsList: Ticket[] = useMemo(() => {
    if (isAdmin) return []
    const raw = myTicketsData?.data
    const payload = unwrapData<{ tickets?: Ticket[] }>(raw)
    return payload && Array.isArray(payload.tickets) ? payload.tickets : []
  }, [isAdmin, myTicketsData?.data])

  return (
    <div className="min-w-0 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {isAdmin
            ? "Ringkasan aktivitas helpdesk dan statistik ticket"
            : "Tiket Anda dan status terbaru"}
        </p>
      </div>

      {isAdmin && (
        <DashboardStats
          stats={unwrapData(statsData?.data) || null}
          isLoading={statsLoading}
        />
      )}

      {!isAdmin && (
        <UserDashboardStats
          stats={userStats}
          isLoading={myTicketsLoading}
        />
      )}

      {isAdmin && (
        <>
          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
            <TicketTrendChart isLoading={false} />
            <PriorityDistribution isLoading={false} />
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
            <UrgentTicketsSection
              tickets={urgentTickets}
              isLoading={recentLoading}
            />
            <ActivityTimeline isLoading={false} />
          </div>
        </>
      )}

      <div className="w-full min-w-0 overflow-hidden">
        <RecentTickets
          tickets={isAdmin ? recentTicketsList : (userTicketsList.length > 0 ? userTicketsList : recentTicketsList)}
          isLoading={isAdmin ? recentLoading : myTicketsLoading}
        />
      </div>
    </div>
  )
}
