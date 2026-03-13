/**
 * Route path constants — menghindari magic string di seluruh komponen navigasi.
 *
 * Gunakan `ROUTES.xxx` untuk semua perpindahan halaman.
 */

export const ROUTES = {
  // Auth
  LOGIN: "/login",

  // Halaman utama
  DASHBOARD: "/",

  // Tickets
  TICKETS: "/tickets",
  TICKET_CREATE: "/tickets/create",
  TICKET_DETAIL: (id: number | string) => `/tickets/${id}` as const,
  TICKET_EDIT: (id: number | string) => `/tickets/${id}/edit` as const,

  // Admin
  ADMIN: "/admin",
  ADMIN_TICKETS: "/admin/tickets",
  ADMIN_TEAMS: "/admin/teams",
  ADMIN_REPORTS: "/admin/reports",

  // Profile
  PROFILE: "/profile",
} as const

/** Tipe union dari semua path statis (tidak termasuk fungsi) */
export type StaticRoute = Extract<
  (typeof ROUTES)[keyof typeof ROUTES],
  string
>
