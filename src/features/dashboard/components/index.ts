/**
 * src/features/dashboard/components/index.ts
 *
 * Feature barrel for dashboard components.
 * Keeps imports stable while legacy dashboard UI remains in src/components/helpdesk/dashboard.
 */

export { StatsCard } from "./StatsCard"
export { UrgentTicketsWidget } from "./UrgentTicketsWidget"
export { DeptResolutionChart } from "./DeptResolutionChart"

export { ActivityTimeline } from "@/components/helpdesk/dashboard/ActivityTimeline"
export { DashboardStats } from "@/components/helpdesk/dashboard/DashboardStats"
export { PriorityDistribution } from "@/components/helpdesk/dashboard/PriorityDistribution"
export { RecentTickets } from "@/components/helpdesk/dashboard/RecentTickets"
export { SimplePriorityStats, SimpleTrendStats } from "@/components/helpdesk/dashboard/SimpleStats"
export { TicketTrendChart } from "@/components/helpdesk/dashboard/TicketTrendChart"
export { UrgentTicketsSection } from "@/components/helpdesk/dashboard/UrgentTicketsSection"
export { UserDashboardStats } from "@/components/helpdesk/dashboard/UserDashboardStats"
