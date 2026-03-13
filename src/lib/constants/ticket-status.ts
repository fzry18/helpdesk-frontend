/**
 * Ticket stage constants — label tampilan & warna badge Tailwind.
 *
 * Nama stage dari backend (Bahasa Indonesia) dimapping ke label yang ramah
 * UI dan class CSS yang sesuai.
 */

/** Label tampilan untuk setiap nama stage */
export const TICKET_STATUS_LABEL: Record<string, string> = {
  // Stage generik
  new: "Baru",
  "New": "Baru",
  "Baru": "Baru",
  "In Progress": "Sedang Diproses",
  "in progress": "Sedang Diproses",
  "Sedang Diproses": "Sedang Diproses",
  "Waiting": "Menunggu",
  "Menunggu": "Menunggu",
  "Resolved": "Selesai",
  "Selesai": "Selesai",
  "Closed": "Ditutup",
  "Ditutup": "Ditutup",
  "Cancelled": "Dibatalkan",
  "Dibatalkan": "Dibatalkan",
  // Stage admin
  "Rejected": "Ditolak",
  "Ditolak": "Ditolak",
  // Stage dengan konfirmasi user
  "Waiting Confirmation": "Menunggu Konfirmasi",
  "Menunggu Konfirmasi": "Menunggu Konfirmasi",
} as const

/**
 * Warna badge Tailwind untuk setiap nama stage.
 * Format: `"<bg-class> <text-class>"` — siap dipakai dengan `cn()`.
 */
export const TICKET_STATUS_COLOR: Record<string, string> = {
  "New": "bg-blue-100 text-blue-700",
  "Baru": "bg-blue-100 text-blue-700",
  new: "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  "Sedang Diproses": "bg-yellow-100 text-yellow-700",
  "in progress": "bg-yellow-100 text-yellow-700",
  "Waiting": "bg-orange-100 text-orange-700",
  "Menunggu": "bg-orange-100 text-orange-700",
  "Waiting Confirmation": "bg-purple-100 text-purple-700",
  "Menunggu Konfirmasi": "bg-purple-100 text-purple-700",
  "Resolved": "bg-green-100 text-green-700",
  "Selesai": "bg-green-100 text-green-700",
  "Closed": "bg-gray-100 text-gray-600",
  "Ditutup": "bg-gray-100 text-gray-600",
  "Cancelled": "bg-red-100 text-red-600",
  "Dibatalkan": "bg-red-100 text-red-600",
  "Rejected": "bg-red-100 text-red-700",
  "Ditolak": "bg-red-100 text-red-700",
} as const

/** Default badge classes jika stage tidak dikenali */
const DEFAULT_COLOR = "bg-gray-100 text-gray-600"
const DEFAULT_LABEL = "Tidak Diketahui"

/**
 * Mengembalikan label tampilan untuk sebuah stage.
 * Jika tidak ditemukan, kembalikan nama stage asli sebagai fallback.
 */
export function getStatusLabel(stageName: string): string {
  return TICKET_STATUS_LABEL[stageName] ?? stageName ?? DEFAULT_LABEL
}

/**
 * Mengembalikan class CSS badge untuk sebuah stage.
 * Jika tidak ditemukan, kembalikan class default (abu-abu).
 */
export function getStatusColor(stageName: string): string {
  return TICKET_STATUS_COLOR[stageName] ?? DEFAULT_COLOR
}
