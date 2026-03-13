/**
 * Dashboard domain types — KPI statistics, chart data, and widget props.
 */

export interface DashboardStats {
  summary?: {
    total?: number
    open?: number
    in_progress?: number
    closed?: number
    rejected?: number
  }
  by_priority?: {
    very_low: number
    low: number
    normal: number
    high: number
    very_high: number
  }
  by_department?: Record<string, { closed: number; rejected: number }>
}

export interface DeptKPIItem {
  name: string
  closed: number
  rejected: number
}

export interface TrendDataPoint {
  date: string
  created: number
  resolved: number
}

/** Priority levels as used by the API (Odoo "0"–"4"). */
export type TicketPriorityCode = "0" | "1" | "2" | "3" | "4"

/** Status groups used for dashboard filtering. */
export type TicketStatusGroup = "Open" | "In Progress" | "Closed" | "Rejected"
