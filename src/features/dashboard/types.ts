export * from "./types/dashboard.types"

export interface DashboardSummary {
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
}

export interface TrendData {
  date: string
  count: number
}

export interface TeamPerformance {
  team: { id: number; name: string }
  summary: {
    total: number
    open: number
    closed: number
    member_count: number
  }
  members: Array<{
    id: number
    name: string
    assigned: number
    closed: number
    open: number
  }>
}
