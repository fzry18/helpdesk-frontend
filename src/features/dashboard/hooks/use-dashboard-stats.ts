/**
 * use-dashboard-stats — Query hook for all dashboard KPI data.
 *
 * Wraps the dashboardAPI calls into domain-specific queries with proper
 * staleTime configuration and data normalization.
 */

"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardAPI } from "@/lib/api/endpoints"
import { useAuthStore, selectIsAdmin } from "@/features/auth/stores/auth.store"
import type { DashboardStats } from "../types/dashboard.types"
import type { Ticket } from "@/types"

/** Unwrap nested `{ data: T }` or return raw value when not wrapped. */
function unwrap<T>(raw: unknown): T | null {
  if (raw == null) return null
  const obj = raw as Record<string, unknown>
  if (typeof obj === "object" && "data" in obj && obj.data != null) return obj.data as T
  return raw as T
}

/** Normalize ticket array from varied API shapes. */
function normalizeTickets(raw: unknown): Ticket[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && "tickets" in raw && Array.isArray((raw as { tickets: Ticket[] }).tickets))
    return (raw as { tickets: Ticket[] }).tickets
  return []
}

// ─── Query key factory ──────────────────────────────────────────────────────

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  myTickets: () => [...dashboardKeys.all, "my-tickets"] as const,
  recent: (isAdmin: boolean) => [...dashboardKeys.all, "recent", isAdmin] as const,
}

// ─── Admin dashboard stats ───────────────────────────────────────────────────

export function useDashboardStats() {
  const isAdmin = useAuthStore(selectIsAdmin)

  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardAPI.getStats(),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1_000, // 5 minutes
    select: (res) => unwrap<DashboardStats>(res?.data),
  })
}

// ─── Recent tickets (admin) ──────────────────────────────────────────────────

const RECENT_LIMIT = 50

export function useRecentTickets() {
  const isAdmin = useAuthStore(selectIsAdmin)

  return useQuery({
    queryKey: dashboardKeys.recent(isAdmin),
    queryFn: () => dashboardAPI.getRecent(RECENT_LIMIT),
    enabled: isAdmin,
    staleTime: 1 * 60 * 1_000, // 1 minute
    select: (res) => normalizeTickets(res?.data),
  })
}

// ─── My tickets (regular user) ───────────────────────────────────────────────

interface MyTicketsPayload {
  stats?: {
    total: number
    open: number
    in_progress?: number
    closed: number
    rejected?: number
  }
  tickets?: Ticket[]
}

export function useMyTickets() {
  const isAdmin = useAuthStore(selectIsAdmin)

  return useQuery({
    queryKey: dashboardKeys.myTickets(),
    queryFn: () => dashboardAPI.getMyTickets(),
    enabled: !isAdmin,
    staleTime: 2 * 60 * 1_000, // 2 minutes
    select: (res) => {
      const payload = unwrap<MyTicketsPayload>(res?.data)
      return {
        stats: payload?.stats
          ? {
              total: payload.stats.total,
              open: payload.stats.open,
              inProgress: payload.stats.in_progress ?? 0,
              closed: payload.stats.closed,
              rejected: payload.stats.rejected ?? 0,
            }
          : null,
        tickets: payload?.tickets ?? [],
      }
    },
  })
}
