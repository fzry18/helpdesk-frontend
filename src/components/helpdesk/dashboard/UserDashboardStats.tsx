"use client"

import { StatCard } from "@/components/ui/stat-card"
import { Ticket, AlertCircle, Clock, CheckCircle2 } from "lucide-react"

interface UserDashboardStatsProps {
  stats: {
    total: number
    open: number
    inProgress: number
    closed: number
  } | null
  isLoading: boolean
}

export function UserDashboardStats({ stats, isLoading }: UserDashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 sm:h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  const total = stats?.total ?? 0
  const open = stats?.open ?? 0
  const inProgress = stats?.inProgress ?? 0
  const closed = stats?.closed ?? 0

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Ticket" value={total} icon={Ticket} color="blue" />
      <StatCard title="Terbuka" value={open} icon={AlertCircle} color="orange" />
      <StatCard title="In Progress" value={inProgress} icon={Clock} color="purple" />
      <StatCard title="Selesai" value={closed} icon={CheckCircle2} color="green" />
    </div>
  )
}
