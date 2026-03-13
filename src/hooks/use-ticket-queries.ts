/**
 * Ticket Query Hooks - Optimized with Proper Pagination
 * 
 * FITUR:
 * - Pagination dengan limit/offset
 * - Infinite scroll support
 * - Prefetch on hover
 * - Background refresh
 * - Optimized cache keys
 */

import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { ticketAPI, messageAPI } from '@/lib/api/endpoints'
import { queryKeys, CACHE_TIME, invalidation } from '@/lib/query/config'
import { toast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/constants/error-messages'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { Ticket } from '@/types'

// Types
export interface TicketListParams {
  page?: number
  limit?: number
  status?: 'all' | 'open' | 'in_progress' | 'closed'
  priority?: string
  ticket_category_type?: 'system' | 'helper'
  search?: string
  team_id?: number
  my_tickets?: boolean
}

// API only supports these status values
type ApiStatus = 'all' | 'open' | 'closed'

// Convert frontend status to API status
function toApiStatus(status: TicketListParams['status']): ApiStatus {
  if (status === 'in_progress') return 'open' // in_progress is filtered client-side
  return status || 'all'
}

const DEFAULT_PAGE_SIZE = 20

/**
 * Hook untuk ticket list dengan pagination
 */
export function useTicketList(params: TicketListParams = {}) {
  const {
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    status = 'all',
    priority,
    ticket_category_type,
    search,
    team_id,
    my_tickets = false
  } = params

  const employee = useAuthStore((s) => s.employee)
  const helpdeskRole = useAuthStore((s) => s.getHelpdeskRole())

  // Normalized filter untuk cache key konsisten (termasuk role agar refetch saat role berubah)
  const filters = useMemo(() => ({
    page,
    limit,
    status: status === 'all' ? undefined : status,
    priority: priority || undefined,
    ticket_category_type: ticket_category_type || undefined,
    search: search?.trim() || undefined,
    team_id: team_id || undefined,
    my_tickets,
    helpdeskRole,
  }), [page, limit, status, priority, ticket_category_type, search, team_id, my_tickets, helpdeskRole])

  return useQuery({
    queryKey: queryKeys.tickets.list(filters),
    queryFn: () => ticketAPI.list({
      page,
      limit,
      status: toApiStatus(status),
      priority,
      ticket_category_type,
      search: search?.trim(),
      team_id,
      my_tickets,
    }),
    enabled: !!employee,
    staleTime: CACHE_TIME.TICKET_LIST.staleTime,
    gcTime: CACHE_TIME.TICKET_LIST.gcTime,
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  })
}

/**
 * Hook untuk infinite scroll ticket list
 * Gunakan ini untuk mobile atau continuous scrolling
 */
export function useInfiniteTicketList(params: Omit<TicketListParams, 'page'> = {}) {
  const {
    limit = DEFAULT_PAGE_SIZE,
    status = 'all',
    priority,
    ticket_category_type,
    search,
    team_id,
    my_tickets = false
  } = params

  const filters = useMemo(() => ({
    limit,
    status: status === 'all' ? undefined : status,
    priority: priority || undefined,
    ticket_category_type: ticket_category_type || undefined,
    search: search?.trim() || undefined,
    team_id: team_id || undefined,
    my_tickets,
  }), [limit, status, priority, ticket_category_type, search, team_id, my_tickets])

  return useInfiniteQuery({
    queryKey: [...queryKeys.tickets.lists(), 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => ticketAPI.list({
      page: pageParam,
      limit,
      status: toApiStatus(status),
      priority,
      ticket_category_type,
      search: search?.trim(),
      team_id,
      my_tickets,
    }),
    getNextPageParam: (lastPage) => {
      if (lastPage.meta?.has_next) {
        return (lastPage.meta.page || 1) + 1
      }
      return undefined
    },
    initialPageParam: 1,
    staleTime: CACHE_TIME.TICKET_LIST.staleTime,
    gcTime: CACHE_TIME.TICKET_LIST.gcTime,
  })
}

/**
 * Hook untuk ticket detail
 */
export function useTicketDetail(ticketId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () => ticketAPI.get(ticketId),
    staleTime: CACHE_TIME.TICKET_DETAIL.staleTime,
    gcTime: CACHE_TIME.TICKET_DETAIL.gcTime,
    enabled: options?.enabled ?? !!ticketId,
  })
}

/**
 * Hook untuk message thread
 */
export function useTicketThread(ticketId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.tickets.thread(ticketId),
    queryFn: () => messageAPI.getThread(ticketId),
    staleTime: CACHE_TIME.TICKET_MESSAGES.staleTime,
    gcTime: CACHE_TIME.TICKET_MESSAGES.gcTime,
    enabled: options?.enabled ?? !!ticketId,
  })
}

/**
 * Hook untuk prefetch ticket detail on hover
 * Gunakan di TicketCard: onMouseEnter={prefetch(ticket.id)}
 */
export function usePrefetchTicket() {
  const queryClient = useQueryClient()

  return useCallback((ticketId: number) => {
    // Prefetch hanya jika belum ada di cache atau sudah stale
    queryClient.prefetchQuery({
      queryKey: queryKeys.tickets.detail(ticketId),
      queryFn: () => ticketAPI.get(ticketId),
      staleTime: CACHE_TIME.TICKET_DETAIL.staleTime,
    })
  }, [queryClient])
}

/**
 * Hook untuk create ticket dengan proper invalidation
 */
export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof ticketAPI.create>[0]) =>
      ticketAPI.create(data),
    onSuccess: () => {
      invalidation.onTicketCreated(queryClient)
      toast({
        title: '✅ Ticket dibuat',
        description: 'Ticket berhasil dibuat',
      })
    },
    onError: (error: any) => {
      toast({
        title: '❌ Gagal',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook untuk update ticket dengan targeted invalidation
 */
export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Ticket> }) =>
      ticketAPI.update(id, data),
    onSuccess: (_, variables) => {
      invalidation.onTicketUpdated(queryClient, variables.id)
      toast({
        title: '✅ Berhasil',
        description: 'Ticket berhasil diperbarui',
      })
    },
    onError: (error: any) => {
      toast({
        title: '❌ Gagal',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook untuk update status dengan targeted invalidation
 */
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, stageId }: { id: number; stageId: number }) =>
      ticketAPI.updateStage(id, stageId),
    onSuccess: (_, variables) => {
      invalidation.onStatusChanged(queryClient, variables.id)
      toast({
        title: '✅ Status diperbarui',
      })
    },
    onError: (error: any) => {
      toast({
        title: '❌ Gagal',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook untuk send message dengan cache injection (no refetch)
 */
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ticketId, body, internal = false }: {
      ticketId: number;
      body: string;
      internal?: boolean
    }) => messageAPI.postMessage(ticketId, { body, internal }),
    onSuccess: (response, variables) => {
      // Inject message ke cache langsung, tidak perlu refetch
      const newMessage = response.data
      queryClient.setQueryData(
        queryKeys.tickets.thread(variables.ticketId),
        (oldData: { data: any[] } | undefined) => {
          if (!oldData?.data) return oldData
          return {
            ...oldData,
            data: [...oldData.data, newMessage]
          }
        }
      )
      toast({ title: 'Pesan terkirim' })
    },
    onError: (error: any) => {
      toast({
        title: '❌ Gagal',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook untuk delete ticket dengan cache removal
 */
export function useDeleteTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => ticketAPI.delete(id),
    onSuccess: (_, id) => {
      invalidation.onTicketDeleted(queryClient, id)
      toast({
        title: '✅ Ticket dihapus',
      })
    },
    onError: (error: any) => {
      toast({
        title: '❌ Gagal',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    },
  })
}

/**
 * Utility: Get initial ticket data from list cache
 * Gunakan untuk show partial data saat navigate ke detail
 */
export function useInitialTicketData(ticketId: number): Ticket | undefined {
  const queryClient = useQueryClient()

  return useMemo(() => {
    // Cari di semua list cache
    const listQueries = queryClient.getQueriesData<{ data: Ticket[] }>({
      queryKey: queryKeys.tickets.lists()
    })

    for (const [, data] of listQueries) {
      if (data?.data) {
        const ticket = data.data.find(t => t.id === ticketId)
        if (ticket) return ticket
      }
    }

    return undefined
  }, [queryClient, ticketId])
}
