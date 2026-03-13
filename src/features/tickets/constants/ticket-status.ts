/**
 * ticket-status.ts — Feature: Tickets / Constants
 *
 * Status-stage mapping untuk Odoo Helpdesk stages.
 * Gunakan untuk mendapatkan label, warna badge, dan ikon.
 */

export const TICKET_STATUS = {
  NEW: "New",
  OPEN: "In Progress",
  WAITING: "Waiting Confirmation",
  DONE: "Done",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
} as const

export type TicketStatusKey = keyof typeof TICKET_STATUS
export type TicketStatusValue = (typeof TICKET_STATUS)[TicketStatusKey]

// ─────────────────────────────────────────────────────────────
// Stage name → display config
// ─────────────────────────────────────────────────────────────

export interface StatusConfig {
  label: string
  /** Tailwind class for badge bg/text */
  className: string
  /** Emoji atau icon name hint */
  icon: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  new: {
    label: "Baru",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    icon: "🆕",
  },
  "in progress": {
    label: "Dalam Proses",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: "⚙️",
  },
  "waiting confirmation": {
    label: "Menunggu Konfirmasi",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    icon: "⏳",
  },
  done: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    icon: "✅",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: "❌",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    icon: "🚫",
  },
}

/** Dapatkan config dari stage_name tiket */
export function getStatusConfig(stageName?: string | null): StatusConfig {
  if (!stageName) {
    return {
      label: "Tidak Diketahui",
      className: "bg-gray-100 text-gray-500",
      icon: "❓",
    }
  }
  const key = stageName.toLowerCase()
  return STATUS_CONFIG[key] ?? {
    label: stageName,
    className: "bg-gray-100 text-gray-600",
    icon: "•",
  }
}

// ─────────────────────────────────────────────────────────────
// Priority constants
// ─────────────────────────────────────────────────────────────

export const TICKET_PRIORITY = {
  "0": { label: "Very Low", className: "bg-gray-100 text-gray-500", stars: 0 },
  "1": {
    label: "Low",
    className: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    stars: 1,
  },
  "2": {
    label: "Normal",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    stars: 2,
  },
  "3": {
    label: "High",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    stars: 3,
  },
  "4": {
    label: "Very High",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    stars: 4,
  },
} as const

export type PriorityKey = keyof typeof TICKET_PRIORITY

export function getPriorityConfig(priority?: string | null) {
  if (!priority || !(priority in TICKET_PRIORITY)) {
    return TICKET_PRIORITY["0"]
  }
  return TICKET_PRIORITY[priority as PriorityKey]
}

// ─────────────────────────────────────────────────────────────
// Category type labels
// ─────────────────────────────────────────────────────────────

export const CATEGORY_TYPE_LABELS = {
  helper: "Ticketing Helper",
  system: "Ticketing System",
} as const

export const SYSTEM_CATEGORY_LABELS: Record<string, string> = {
  odoo: "Odoo",
  p2h: "P2H",
  job_portal: "Job Portal",
  other: "Lainnya",
}
