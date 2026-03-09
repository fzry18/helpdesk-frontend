"use client"

import { StatCard } from "@/components/ui/stat-card"
import { Ticket, CheckCircle2, FileEdit, Clock, Calendar, XCircle } from "lucide-react"

interface DashboardStatsProps {
  stats: {
    summary: {
      total: number
      draft: number
      open: number
      in_progress: number
      closed: number
      rejected: number
      unassigned: number
    }
    period: {
      today: number
      this_week: number
      this_month: number
    }
    by_priority: {
      very_low: number
      low: number
      normal: number
      high: number
      very_high: number
    }
    by_stage: Array<{ id: number; name: string; count: number }>
  } | null
  isLoading: boolean
  onStatClick?: (status: string) => void
}

export function DashboardStats({ stats, isLoading, onStatClick }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 sm:h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-6">
      <StatCard
        title="Total Tiket"
        value={stats?.summary?.total || 0}
        icon={Ticket}
        color="blue"
        onClick={() => onStatClick?.("all")}
      />
      <StatCard
        title="Draft"
        value={stats?.summary?.draft || 0}
        icon={FileEdit}
        color="orange"
        onClick={() => onStatClick?.("draft")}
      />
      <StatCard
        title="In Progress"
        value={stats?.summary?.in_progress || 0}
        icon={Clock}
        color="amber"
        onClick={() => onStatClick?.("in_progress")}
      />
      <StatCard
        title="Selesai"
        value={stats?.summary?.closed || 0}
        icon={CheckCircle2}
        color="green"
        onClick={() => onStatClick?.("closed")}
      />
      <StatCard
        title="Ditolak"
        value={stats?.summary?.rejected || 0}
        icon={XCircle}
        color="red"
        onClick={() => onStatClick?.("rejected")}
      />
      <StatCard
        title="Hari Ini"
        value={stats?.period?.today || 0}
        icon={Calendar}
        color="purple"
        onClick={() => onStatClick?.("today")}
      />
    </div>
  )
}

