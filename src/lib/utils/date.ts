/**
 * Date formatting utilities menggunakan date-fns.
 *
 * Semua fungsi menerima `string | Date | null | undefined` agar aman dipakai
 * langsung dengan data dari API (yang bisa `null`).
 */
import {
  format,
  formatDistanceToNow,
  parseISO,
  isValid,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from "date-fns"
import { id as idLocale } from "date-fns/locale"

/** Fallback jika tanggal tidak valid */
const INVALID_DATE_FALLBACK = "-"

/** Parse input ke Date object; kembalikan null jika tidak valid */
function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null
  const parsed = typeof date === "string" ? parseISO(date) : date
  return isValid(parsed) ? parsed : null
}

/**
 * Format ke tanggal panjang.
 * @example "15 Jan 2025"
 */
export function formatDate(
  date: string | Date | null | undefined
): string {
  const parsed = parseDate(date)
  if (!parsed) return INVALID_DATE_FALLBACK
  return format(parsed, "d MMM yyyy", { locale: idLocale })
}

/**
 * Format ke tanggal + jam.
 * @example "15 Jan 2025, 10:30"
 */
export function formatDateTime(
  date: string | Date | null | undefined
): string {
  const parsed = parseDate(date)
  if (!parsed) return INVALID_DATE_FALLBACK
  return format(parsed, "d MMM yyyy, HH:mm", { locale: idLocale })
}

/**
 * Format ke waktu relatif dari sekarang.
 * @example "2 jam yang lalu", "3 hari yang lalu"
 */
export function formatRelative(
  date: string | Date | null | undefined
): string {
  const parsed = parseDate(date)
  if (!parsed) return INVALID_DATE_FALLBACK
  return formatDistanceToNow(parsed, { addSuffix: true, locale: idLocale })
}

/**
 * Format ke jam dan menit saja.
 * @example "10:30"
 */
export function formatTime(
  date: string | Date | null | undefined
): string {
  const parsed = parseDate(date)
  if (!parsed) return INVALID_DATE_FALLBACK
  return format(parsed, "HH:mm", { locale: idLocale })
}

/**
 * Menghitung durasi resolusi antara dua tanggal.
 * Mengembalikan string yang mudah dibaca.
 * @example "3 hari 2 jam", "45 menit", "30 detik"
 */
export function calcResolutionDuration(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  const startDate = parseDate(start)
  const endDate = parseDate(end)

  if (!startDate || !endDate) return INVALID_DATE_FALLBACK

  const totalSeconds = differenceInSeconds(endDate, startDate)
  if (totalSeconds < 0) return INVALID_DATE_FALLBACK
  if (totalSeconds < 60) return `${totalSeconds} detik`

  const totalMinutes = differenceInMinutes(endDate, startDate)
  if (totalMinutes < 60) return `${totalMinutes} menit`

  const hours = differenceInHours(endDate, startDate)
  if (hours < 24) {
    const remainingMinutes = totalMinutes - hours * 60
    return remainingMinutes > 0
      ? `${hours} jam ${remainingMinutes} menit`
      : `${hours} jam`
  }

  const days = differenceInDays(endDate, startDate)
  const remainingHours = hours - days * 24
  return remainingHours > 0
    ? `${days} hari ${remainingHours} jam`
    : `${days} hari`
}

/**
 * Format durasi waktu dalam detik ke string yang mudah dibaca.
 * Berguna untuk `total_time_spent` field di Ticket.
 * @example formatDurationSeconds(3661) → "1 jam 1 menit 1 detik"
 */
export function formatDurationSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "-"
  if (totalSeconds < 60) return `${totalSeconds} detik`

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} jam`)
  if (minutes > 0) parts.push(`${minutes} menit`)
  if (seconds > 0 && hours === 0) parts.push(`${seconds} detik`)

  return parts.join(" ")
}
