"use client"

import { StatCard } from "@/components/ui/stat-card"
import { Ticket, CheckCircle2, AlertCircle, Clock } from "lucide-react"

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
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  // Mock trends - in real app, these would come from API comparing to previous period
  const mockTrends = {
    total: { value: 12, isPositive: true },
    open: { value: 5, isPositive: true },
    closed: { value: 8, isPositive: true },
    today: { value: 2, isPositive: true },
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Tiket"
        value={stats?.summary?.total || 0}
        icon={Ticket}
        color="blue"
        trend={mockTrends.total}
      />
      <StatCard
        title="Tiket Terbuka"
        value={stats?.summary?.open || 0}
        icon={AlertCircle}
        color="orange"
        trend={mockTrends.open}
      />
      <StatCard
        title="Tiket Selesai"
        value={stats?.summary?.closed || 0}
        icon={CheckCircle2}
        color="green"
        trend={mockTrends.closed}
      />
      <StatCard
        title="Hari Ini"
        value={stats?.period?.today || 0}
        icon={Clock}
        color="purple"
        trend={mockTrends.today}
      />
    </div>
  )
}

