/**
 * use-ticket-detail.ts — Feature: Tickets / Hooks
 *
 * Single-responsibility: fetch detail tiket + riwayat pesan.
 *
 * Exposes:
 *  - useTicketDetail     — detail satu tiket by ID
 *  - useTicketThread     — message/comment thread
 *  - useInitialTicketData — ambil partial data dari list cache (optimistic render)
 */

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { ticketAPI, messageAPI } from "@/lib/api/endpoints"
import { queryKeys, CACHE_TIME } from "@/lib/query/config"
import type { Ticket } from "@/types"

// ─────────────────────────────────────────────────────────────
// useTicketDetail
// ─────────────────────────────────────────────────────────────

/**
 * Fetch detail satu tiket.
 *
 * @param ticketId - ID tiket (0 atau undefined → query disabled)
 * @param options.enabled - override enabled flag
 */
export function useTicketDetail(
  ticketId: number | undefined,
  options?: { enabled?: boolean },
) {
  const id = ticketId ?? 0

  return useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => ticketAPI.get(id),
    enabled: options?.enabled ?? id > 0,
    staleTime: CACHE_TIME.TICKET_DETAIL.staleTime,
    gcTime: CACHE_TIME.TICKET_DETAIL.gcTime,
  })
}

// ─────────────────────────────────────────────────────────────
// useTicketThread
// ─────────────────────────────────────────────────────────────

/**
 * Fetch message thread (komentar & internal notes) sebuah tiket.
 * staleTime = 0 → selalu fresh; WebSocket akan inject pesan baru via
 * queryClient.setQueryData sehingga tidak perlu polling.
 *
 * @param ticketId - ID tiket
 * @param options.enabled - override enabled flag
 */
export function useTicketThread(
  ticketId: number | undefined,
  options?: { enabled?: boolean },
) {
  const id = ticketId ?? 0

  return useQuery({
    queryKey: queryKeys.tickets.thread(id),
    queryFn: () => messageAPI.getThread(id),
    enabled: options?.enabled ?? id > 0,
    staleTime: CACHE_TIME.TICKET_MESSAGES.staleTime,
    gcTime: CACHE_TIME.TICKET_MESSAGES.gcTime,
  })
}

// ─────────────────────────────────────────────────────────────
// useInitialTicketData — optimistic render dari list cache
// ─────────────────────────────────────────────────────────────

/**
 * Cari data tiket dari semua list cache yang tersedia.
 * Berguna untuk menampilkan data parsial saat navigasi ke halaman detail
 * sebelum detail query selesai.
 *
 * @param ticketId - ID tiket yang dicari
 * @returns Ticket | undefined
 */
export function useInitialTicketData(ticketId: number): Ticket | undefined {
  const queryClient = useQueryClient()

  return useMemo(() => {
    const listQueries = queryClient.getQueriesData<{ data: Ticket[] }>({
      queryKey: queryKeys.tickets.lists(),
    })

    for (const [, data] of listQueries) {
      if (data?.data) {
        const ticket = data.data.find((t) => t.id === ticketId)
        if (ticket) return ticket
      }
    }

    return undefined
  }, [queryClient, ticketId])
}
