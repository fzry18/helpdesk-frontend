/**
 * useTicketRealtime — Fitur: Realtime
 *
 * Hook domain spesifik yang:
 * - Subscribe ke event Socket.io terkait tiket
 * - Meng-update React Query cache secara presisi (setQueryData / invalidateQueries)
 * - TIDAK mengandung logika UI (tidak ada state, tidak ada dialog, tidak ada toast)
 * - TIDAK membuat koneksi baru — bergantung pada WsManager yang sudah diinisialisasi
 *   oleh SocketProvider
 *
 * STRATEGI CACHE UPDATE (diwarisi dari pattern di use-ticket-websocket.ts lama):
 * - ticket_status_changed / ticket_assigned / ticket_priority_changed
 *     → setQueryData pada detail + setQueriesData pada semua list (patch sebagian)
 *     → invalidate dashboard stats (jangan refetch)
 * - message_new
 *     → setQueryData pada thread (inject message, skip duplicate)
 * - ticket_created
 *     → invalidate list + dashboard (refetchType: 'active')
 * - ticket_closed
 *     → setQueryData pada detail + invalidate dashboard
 * - notification
 *     → callback opsional onNotification (untuk toast di layer UI)
 *
 * CARA PAKAI:
 * ```tsx
 * // Di halaman daftar tiket (global — tanpa ticketId)
 * useTicketRealtime()
 *
 * // Di halaman detail tiket (room-based)
 * useTicketRealtime({ ticketId: 42 })
 *
 * // Dengan callback notifikasi (untuk toast UI)
 * useTicketRealtime({ onNotification: (data) => toast(data.message) })
 * ```
 */
import { useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/config"
import { wsOn, wsJoinRoom, wsLeaveRoom } from "@/features/realtime/ws-manager"
import { useSocketContext } from "@/features/realtime/providers/SocketProvider"
import type { Ticket, Message } from "@/types"

// ─────────────────────────────────────────────────────────────
// Types untuk payload event
// ─────────────────────────────────────────────────────────────

interface TicketChangePayload {
  ticket_id: number
  data: Partial<Ticket>
}

interface MessageNewPayload {
  ticket_id: number
  data: Message
}

interface TicketCreatedPayload {
  ticket_id: number
  data: Ticket
}

interface TicketClosedPayload {
  ticket_id: number
  data: Partial<Ticket>
}

interface NotificationPayload {
  message: string
  type?: "info" | "success" | "warning" | "error"
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────
// Cache update helpers (pure functions — mudah di-test sendiri)
// ─────────────────────────────────────────────────────────────

type PaginatedTickets = { data: Ticket[]; [key: string]: unknown }
type DetailTicket = { data: Ticket; [key: string]: unknown }
type ThreadMessages = { data: Message[]; [key: string]: unknown }

function patchTicketInDetail(
  old: DetailTicket | undefined,
  patch: Partial<Ticket>
): DetailTicket | undefined {
  if (!old) return old
  return { ...old, data: { ...old.data, ...patch } }
}

function patchTicketInList(
  old: PaginatedTickets | undefined,
  ticketId: number,
  patch: Partial<Ticket>
): PaginatedTickets | undefined {
  if (!old?.data) return old
  return {
    ...old,
    data: old.data.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)),
  }
}

function injectMessage(
  old: ThreadMessages | undefined,
  message: Message
): ThreadMessages | undefined {
  if (!old?.data) return old
  // Cegah duplikat (mis. jika optimistic update sudah ada)
  if (old.data.some((m) => m.id === message.id)) return old
  return { ...old, data: [...old.data, message] }
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export interface UseTicketRealtimeOptions {
  /** Jika diberikan, hook akan join room "ticket:{ticketId}" */
  ticketId?: number
  /** Dipanggil jika server mengirim event "notification" */
  onNotification?: (payload: NotificationPayload) => void
  /**
   * Jika false, hook tidak akan subscribe event apapun.
   * Berguna untuk disable secara kondisional.
   * @default true
   */
  enabled?: boolean
}

export function useTicketRealtime({
  ticketId,
  onNotification,
  enabled = true,
}: UseTicketRealtimeOptions = {}) {
  const queryClient = useQueryClient()
  const { isConnected } = useSocketContext()

  // ── Handler: ticket berubah (status / assign / priority) ──
  const handleTicketChange = useCallback(
    (payload: TicketChangePayload) => {
      const { ticket_id, data } = payload

      queryClient.setQueryData<DetailTicket>(
        queryKeys.tickets.detail(ticket_id),
        (old) => patchTicketInDetail(old, data)
      )

      queryClient.setQueriesData<PaginatedTickets>(
        { queryKey: queryKeys.tickets.lists() },
        (old) => patchTicketInList(old, ticket_id, data)
      )

      // Dashboard stats menjadi stale tapi jangan auto-refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
        refetchType: "none",
      })
    },
    [queryClient]
  )

  // ── Handler: pesan baru ──────────────────────────────────
  const handleMessageNew = useCallback(
    (payload: MessageNewPayload) => {
      queryClient.setQueryData<ThreadMessages>(
        queryKeys.tickets.thread(payload.ticket_id),
        (old) => injectMessage(old, payload.data)
      )
    },
    [queryClient]
  )

  // ── Handler: tiket baru dibuat ──────────────────────────
  const handleTicketCreated = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.tickets.lists(),
      refetchType: "active",
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.all,
      refetchType: "active",
    })
  }, [queryClient])

  // ── Handler: tiket ditutup ──────────────────────────────
  const handleTicketClosed = useCallback(
    (payload: TicketClosedPayload) => {
      const { ticket_id, data } = payload

      queryClient.setQueryData<DetailTicket>(
        queryKeys.tickets.detail(ticket_id),
        (old) => patchTicketInDetail(old, data)
      )

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.stats(),
        refetchType: "active",
      })
    },
    [queryClient]
  )

  // ── Handler: notifikasi ─────────────────────────────────
  const handleNotification = useCallback(
    (payload: NotificationPayload) => {
      onNotification?.(payload)
    },
    [onNotification]
  )

  // ── Subscribe events ─────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isConnected) return

    const offStatusChanged = wsOn<TicketChangePayload>(
      "ticket_status_changed",
      handleTicketChange
    )
    const offAssigned = wsOn<TicketChangePayload>(
      "ticket_assigned",
      handleTicketChange
    )
    const offPriorityChanged = wsOn<TicketChangePayload>(
      "ticket_priority_changed",
      handleTicketChange
    )
    const offMessageNew = wsOn<MessageNewPayload>("message_new", handleMessageNew)
    const offTicketCreated = wsOn<TicketCreatedPayload>(
      "ticket_created",
      handleTicketCreated
    )
    const offTicketClosed = wsOn<TicketClosedPayload>(
      "ticket_closed",
      handleTicketClosed
    )
    const offNotification = wsOn<NotificationPayload>(
      "notification",
      handleNotification
    )

    return () => {
      offStatusChanged()
      offAssigned()
      offPriorityChanged()
      offMessageNew()
      offTicketCreated()
      offTicketClosed()
      offNotification()
    }
  }, [
    enabled,
    isConnected,
    handleTicketChange,
    handleMessageNew,
    handleTicketCreated,
    handleTicketClosed,
    handleNotification,
  ])

  // ── Join/Leave room jika ticketId diberikan ──────────────
  useEffect(() => {
    if (!enabled || !isConnected || !ticketId) return

    const room = `ticket:${ticketId}`
    wsJoinRoom(room)
    return () => wsLeaveRoom(room)
  }, [enabled, isConnected, ticketId])
}
