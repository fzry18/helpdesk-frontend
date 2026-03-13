/**
 * use-ticket-list.ts — Feature: Tickets / Hooks
 *
 * Single-responsibility: fetch daftar tiket + pagination.
 * Mengambil filter dari ticket-filter.store sehingga komponen tidak perlu
 * meneruskan props filter secara manual.
 *
 * Exposes:
 *  - useTicketList        — paginated list (pakai di TicketList.tsx)
 *  - useInfiniteTicketList — infinite scroll (opsional mobile)
 *  - usePrefetchTicket    — prefetch on hover (pakai di TicketListItem.tsx)
 */

import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { ticketService } from "@/features/tickets/services/ticket.service"
import { queryKeys, CACHE_TIME } from "@/lib/query/config"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { useTicketFilterStore } from "@/features/tickets/stores/ticket-filter.store"

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

/** API hanya menerima open | closed | all — in_progress difilter di client */
type ApiStatus = "open" | "closed" | "all"

function toApiStatus(status: string | null): ApiStatus {
  if (!status || status === "all") return "all"
  if (status === "in_progress") return "open"
  if (status === "closed") return "closed"
  return "all"
}

// ─────────────────────────────────────────────────────────────
// useTicketList — paginated
// ─────────────────────────────────────────────────────────────

/**
 * Fetch paginated ticket list.
 * Filter state diambil langsung dari useTicketFilterStore.
 */
export function useTicketList() {
  const employee = useAuthStore((s) => s.employee)
  const helpdeskRole = useAuthStore((s) => s.getHelpdeskRole())

  // Baca semua filter dari store
  const status = useTicketFilterStore((s) => s.status)
  const priority = useTicketFilterStore((s) => s.priority)
  const teamId = useTicketFilterStore((s) => s.teamId)
  const search = useTicketFilterStore((s) => s.search)
  const ticketCategoryType = useTicketFilterStore((s) => s.ticketCategoryType)
  const page = useTicketFilterStore((s) => s.page)
  const pageSize = useTicketFilterStore((s) => s.pageSize)
  const categoryId = useTicketFilterStore((s) => s.categoryId)
  const sortBy = useTicketFilterStore((s) => s.sortBy)
  const sortOrder = useTicketFilterStore((s) => s.sortOrder)

  /** Cache key stabil — hanya re-query ketika nilai berubah */
  const filters = useMemo(
    () => ({
      page,
      limit: pageSize,
      status: status ?? undefined,
      priority: priority ?? undefined,
      teamId: teamId ?? undefined,
      categoryId: categoryId ?? undefined,
      search: search.trim() || undefined,
      ticketCategoryType: ticketCategoryType ?? undefined,
      sortBy,
      sortOrder,
      helpdeskRole,
    }),
    [
      page,
      pageSize,
      status,
      priority,
      teamId,
      categoryId,
      search,
      ticketCategoryType,
      sortBy,
      sortOrder,
      helpdeskRole,
    ],
  )

  return useQuery({
    queryKey: queryKeys.tickets.list(filters),
    queryFn: () =>
      ticketService.list({
        page,
        limit: pageSize,
        status: toApiStatus(status),
        priority: priority ?? undefined,
        team_id: teamId ?? undefined,
        category_id: categoryId ?? undefined,
        search: search.trim() || undefined,
        ticket_category_type: ticketCategoryType ?? undefined,
        sort: sortBy,
        order: sortOrder,
      }),
    enabled: !!employee,
    staleTime: CACHE_TIME.TICKET_LIST.staleTime,
    gcTime: CACHE_TIME.TICKET_LIST.gcTime,
    /** Tampilkan data lama selama refetch agar tabel tidak berkedip */
    placeholderData: (previous) => previous,
  })
}

// ─────────────────────────────────────────────────────────────
// useInfiniteTicketList — infinite scroll (opsional / mobile)
// ─────────────────────────────────────────────────────────────

export function useInfiniteTicketList() {
  const employee = useAuthStore((s) => s.employee)

  const status = useTicketFilterStore((s) => s.status)
  const priority = useTicketFilterStore((s) => s.priority)
  const teamId = useTicketFilterStore((s) => s.teamId)
  const search = useTicketFilterStore((s) => s.search)
  const ticketCategoryType = useTicketFilterStore((s) => s.ticketCategoryType)
  const pageSize = useTicketFilterStore((s) => s.pageSize)

  const filters = useMemo(
    () => ({
      limit: pageSize,
      status: status ?? undefined,
      priority: priority ?? undefined,
      teamId: teamId ?? undefined,
      search: search.trim() || undefined,
      ticketCategoryType: ticketCategoryType ?? undefined,
    }),
    [pageSize, status, priority, teamId, search, ticketCategoryType],
  )

  return useInfiniteQuery({
    queryKey: [...queryKeys.tickets.lists(), "infinite", filters],
    queryFn: ({ pageParam = 1 }) =>
      ticketService.list({
        page: pageParam as number,
        limit: pageSize,
        status: toApiStatus(status),
        priority: priority ?? undefined,
        team_id: teamId ?? undefined,
        search: search.trim() || undefined,
        ticket_category_type: ticketCategoryType ?? undefined,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta?.has_next) {
        return (lastPage.meta.page ?? 1) + 1
      }
      return undefined
    },
    initialPageParam: 1,
    enabled: !!employee,
    staleTime: CACHE_TIME.TICKET_LIST.staleTime,
    gcTime: CACHE_TIME.TICKET_LIST.gcTime,
  })
}

// ─────────────────────────────────────────────────────────────
// usePrefetchTicket — prefetch on hover
// ─────────────────────────────────────────────────────────────

/**
 * Gunakan di TicketListItem:
 *   const prefetch = usePrefetchTicket()
 *   <div onMouseEnter={() => prefetch(ticket.id)}>
 */
export function usePrefetchTicket() {
  const queryClient = useQueryClient()

  return useCallback(
    (ticketId: number) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.tickets.detail(ticketId),
        queryFn: () => ticketService.get(ticketId),
        staleTime: CACHE_TIME.TICKET_DETAIL.staleTime,
      })
    },
    [queryClient],
  )
}
