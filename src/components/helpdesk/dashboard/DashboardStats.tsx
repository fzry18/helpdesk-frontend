"use client"

import { StatCard } from "@/components/ui/stat-card"
import { Ticket, CheckCircle2, FileEdit, Clock, Calendar } from "lucide-react"

interface DashboardStatsProps {
  stats: {
    summary: {
      total: number
      open: number
      closed: number
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
  // Mock trends - in real app, these would come from API comparing to previous period
  const mockTrends = {
    total: { value: 12, isPositive: true },
    draft: { value: 3, isPositive: true },
    inProgress: { value: 5, isPositive: true },
    closed: { value: 8, isPositive: true },
    today: { value: 2, isPositive: true },
  }

  // Count draft tickets from by_stage where stage name contains "draft", "new", or "baru"
  const getDraftCount = () => {
    if (!stats?.by_stage) return 0
    return stats.by_stage
      .filter((stage) => {
        const name = stage.name.toLowerCase()
        return name.includes("draft") || name.includes("new") || name.includes("baru")
      })
      .reduce((sum, stage) => sum + stage.count, 0)
  }

  // In Progress = open - draft
  const getInProgressCount = () => {
    const open = stats?.summary?.open || 0
    const draft = getDraftCount()
    return Math.max(0, open - draft)
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 sm:h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Tiket"
        value={stats?.summary?.total || 0}
        icon={Ticket}
        color="blue"
        trend={mockTrends.total}
        onClick={() => onStatClick?.("all")}
      />
      <StatCard
        title="Draft"
        value={getDraftCount()}
        icon={FileEdit}
        color="orange"
        trend={mockTrends.draft}
        onClick={() => onStatClick?.("draft")}
      />
      <StatCard
        title="In Progress"
        value={getInProgressCount()}
        icon={Clock}
        color="amber"
        trend={mockTrends.inProgress}
        onClick={() => onStatClick?.("in_progress")}
      />
      <StatCard
        title="Tiket Selesai"
        value={stats?.summary?.closed || 0}
        icon={CheckCircle2}
        color="green"
        trend={mockTrends.closed}
        onClick={() => onStatClick?.("closed")}
      />
      <StatCard
        title="Hari Ini"
        value={stats?.period?.today || 0}
        icon={Calendar}
        color="purple"
        trend={mockTrends.today}
        onClick={() => onStatClick?.("today")}
      />
    </div>
  )
}

