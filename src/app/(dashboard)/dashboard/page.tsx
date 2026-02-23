"use client"

import React, { useMemo, useCallback, Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { dashboardAPI } from "@/lib/api/endpoints"
import { useAuthStore, selectIsAdmin, selectHelpdeskRole } from "@/store/authStore"
import { LazyDashboardStats, LazyUserDashboardStats, LazyRecentTickets, useLazyLoad } from "@/components/lazy/LazyComponents"
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { LazyChartWrapper, DeferredRender, useIsMobile } from '@/components/ui/lazy-render'
import { SimplePriorityStats, SimpleTrendStats } from '@/components/helpdesk/dashboard/SimpleStats'
import type { Ticket } from "@/types"

// Lazy load heavy chart components with ssr: false to reduce initial bundle
const LazyTicketTrendChart = dynamic(
  () => import('@/components/helpdesk/dashboard/TicketTrendChart').then(mod => ({ default: mod.TicketTrendChart })),
  { loading: () => null, ssr: false }
)

const LazyPriorityDistribution = dynamic(
  () => import('@/components/helpdesk/dashboard/PriorityDistribution').then(mod => ({ default: mod.PriorityDistribution })),
  { loading: () => null, ssr: false }
)

const LazyUrgentTicketsSection = dynamic(
  () => import('@/components/helpdesk/dashboard/UrgentTicketsSection').then(mod => ({ default: mod.UrgentTicketsSection })),
  { loading: () => null, ssr: false }
)

const LazyDepartmentKPIChart = dynamic(
  () => import('@/components/helpdesk/dashboard/DepartmentKPIChart').then(mod => ({ default: mod.DepartmentKPIChart })),
  { loading: () => null, ssr: false }
)


const RECENT_LIMIT = 50

function normalizeRecentData(raw: unknown): Ticket[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && "tickets" in raw && Array.isArray((raw as { tickets: Ticket[] }).tickets))
    return (raw as { tickets: Ticket[] }).tickets
  return []
}

function unwrapData<T>(raw: unknown): T | null {
  if (raw == null) return null
  const obj = raw as Record<string, unknown>
  if (typeof obj === "object" && "data" in obj && obj.data != null) return obj.data as T
  return raw as T
}

function getTicketStatusGroup(t: Ticket): "Open" | "In Progress" | "Closed" | "Rejected" {
  // Cek rejected PERTAMA, sebelum cek stage
  if (t.is_rejected) return "Rejected"
  const name = ((t.stage?.actual_name ?? t.stage?.name) ?? "").toString().toLowerCase()
  if (name.includes("closed") || name.includes("selesai") || t.resolution_confirmed === true) return "Closed"
  if (name.includes("progress") || name.includes("in progress") || name.includes("awaiting") || name.includes("confirmation") || name.includes("menunggu")) return "In Progress"
  return "Open"
}

function computeUserStatsFromTickets(tickets: Ticket[]): { total: number; open: number; inProgress: number; closed: number; rejected: number } {
  let open = 0, inProgress = 0, closed = 0, rejected = 0
  for (const t of tickets) {
    const g = getTicketStatusGroup(t)
    if (g === "Open") open++
    else if (g === "In Progress") inProgress++
    else if (g === "Rejected") rejected++
    else closed++
  }
  return { total: tickets.length, open, inProgress, closed, rejected }
}


export default function DashboardPage() {
  // Use selectors for optimized re-renders
  const isAdmin = useAuthStore(selectIsAdmin)
  const helpdeskRole = useAuthStore(selectHelpdeskRole)
  const employee = useAuthStore((s) => s.employee)
  const isMobile = useIsMobile(768)
  const router = useRouter()

  const handleStatClick = useCallback((status: string) => {
    if (status === "all") {
      router.push("/tickets")
    } else if (status === "today") {
      router.push("/tickets?created_today=true")
    } else {
      router.push(`/tickets?status=${status}`)
    }
  }, [router])

  // Memoized query functions dengan standard API
  const getStats = useCallback(() => dashboardAPI.getStats(), [])
  const getMyTickets = useCallback(() => dashboardAPI.getMyTickets(), [])
  const getRecent = useCallback(() => dashboardAPI.getRecent(RECENT_LIMIT), [])

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getStats,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })

  const { data: myTicketsData, isLoading: myTicketsLoading } = useQuery({
    queryKey: ["dashboard", "my-tickets"],
    queryFn: getMyTickets,
    enabled: !isAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  })

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ["dashboard", "recent", isAdmin],
    queryFn: getRecent,
    enabled: isAdmin,
    staleTime: 1 * 60 * 1000, // 1 minute cache
  })

  const recentTicketsList: Ticket[] = useMemo(
    () => normalizeRecentData(recentData?.data),
    [recentData?.data]
  )

  const urgentTickets = useMemo(
    () => recentTicketsList.filter((t) =>
      (t.priority === "3" || t.priority === "4") &&
      !t.is_rejected &&
      getTicketStatusGroup(t) === "In Progress"
    ),
    [recentTicketsList]
  )

  const userStats = useMemo(() => {
    if (isAdmin) return null
    const raw = myTicketsData?.data
    const payload = unwrapData<{ stats?: { total: number; open: number; in_progress?: number; closed: number; rejected?: number }; tickets?: Ticket[] }>(raw)
    
    // Use backend stats if available
    if (payload?.stats) {
      return {
        total: payload.stats.total,
        open: payload.stats.open,
        inProgress: payload.stats.in_progress ?? 0,
        closed: payload.stats.closed,
        rejected: payload.stats.rejected ?? 0,
      }
    }
    
    // Fallback: calculate from tickets
    const tickets = payload && Array.isArray(payload.tickets) ? payload.tickets : []
    return computeUserStatsFromTickets(tickets)
  }, [isAdmin, myTicketsData?.data])

  // For user dashboard, use their own tickets from my-tickets API
  const userTicketsList: Ticket[] = useMemo(() => {
    if (isAdmin) return []
    const raw = myTicketsData?.data
    const payload = unwrapData<{ tickets?: Ticket[] }>(raw)
    return payload && Array.isArray(payload.tickets) ? payload.tickets : []
  }, [isAdmin, myTicketsData?.data])

  return (
    <div className="min-w-0 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {helpdeskRole === "super_admin"
              ? "Ringkasan aktivitas helpdesk dan statistik ticket"
              : helpdeskRole === "dept_admin"
              ? `Statistik ticket departemen ${employee?.department || "Anda"}`
              : "Tiket Anda dan status terbaru"}
          </p>
        </div>
      </div>

      {isAdmin && (
        <LazyDashboardStats
          stats={unwrapData(statsData?.data) || null}
          isLoading={statsLoading}
          onStatClick={handleStatClick}
        />
      )}

      {!isAdmin && (
        <Suspense fallback={<Skeleton height="120px" />}>
          <LazyUserDashboardStats
            stats={userStats}
            isLoading={myTicketsLoading}
          />
        </Suspense>
      )}

      {isAdmin && (
        <>
          {/* Mobile: Simple lightweight stats without heavy chart library */}
          {isMobile && (
            <DeferredRender delay={100} mobileDelay={300} fallback={
              <div className="grid gap-4 grid-cols-1">
                <Skeleton className="h-[150px] rounded-lg" />
                <Skeleton className="h-[200px] rounded-lg" />
              </div>
            }>
              <div className="grid gap-4 grid-cols-1">
                <SimpleTrendStats 
                  created={unwrapData<{ summary?: { total?: number } }>(statsData?.data)?.summary?.total || 0}
                  resolved={unwrapData<{ summary?: { closed?: number } }>(statsData?.data)?.summary?.closed || 0}
                  period="Total"
                />
                <SimplePriorityStats 
                  data={unwrapData<{ by_priority?: { very_low: number; low: number; normal: number; high: number; very_high: number } }>(statsData?.data)?.by_priority}
                />
              </div>
            </DeferredRender>
          )}

          {/* Desktop: Full interactive charts */}
          {!isMobile && (
            <DeferredRender delay={100} mobileDelay={1500} fallback={
              <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
                <Skeleton className="h-[350px] rounded-lg" />
                <Skeleton className="h-[350px] rounded-lg" />
              </div>
            }>
              <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
                <LazyChartWrapper height="350px" delay={0} mobileDelay={500}>
                  <LazyTicketTrendChart isLoading={false} />
                </LazyChartWrapper>
                <LazyChartWrapper height="350px" delay={150} mobileDelay={1000}>
                  <LazyPriorityDistribution isLoading={false} />
                </LazyChartWrapper>
              </div>
            </DeferredRender>
          )}
        </>
      )}

      {isAdmin && (
        <DeferredRender delay={isMobile ? 500 : 300} mobileDelay={1500} fallback={
          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
            <Skeleton className="h-[400px] rounded-lg" />
            {helpdeskRole === "super_admin" && (
              <Skeleton className="h-[400px] rounded-lg" />
            )}
          </div>
        }>
          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
            <LazyChartWrapper height="400px" delay={0} mobileDelay={500}>
              <LazyUrgentTicketsSection
                tickets={urgentTickets}
                isLoading={recentLoading}
              />
            </LazyChartWrapper>
            {helpdeskRole === "super_admin" && (
              <LazyChartWrapper height="400px" delay={150} mobileDelay={1000}>
                <LazyDepartmentKPIChart
                  tickets={recentTicketsList}
                  isLoading={recentLoading}
                />
              </LazyChartWrapper>
            )}
          </div>
        </DeferredRender>
      )}

      <div className="w-full min-w-0 overflow-hidden">
        <LazyRecentTickets
          tickets={isAdmin ? recentTicketsList : userTicketsList}
          isLoading={isAdmin ? recentLoading : myTicketsLoading}
        />
      </div>
    </div>
  )
}
