/**
 * Public API for `features/dashboard`.
 *
 * Import all dashboard components and hooks from this barrel file so that
 * callers are decoupled from the internal directory structure.
 */

// Hooks
export { useDashboardStats, useRecentTickets, useMyTickets, dashboardKeys } from "./hooks/use-dashboard-stats"

// Components
export { StatsCard } from "./components/StatsCard"
export { UrgentTicketsWidget } from "./components/UrgentTicketsWidget"
export { DeptResolutionChart } from "./components/DeptResolutionChart"

// Types
export type {
  DashboardStats,
  DeptKPIItem,
  TrendDataPoint,
  TicketPriorityCode,
  TicketStatusGroup,
} from "./types/dashboard.types"
