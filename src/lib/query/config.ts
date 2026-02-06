/**
 * React Query Configuration - Optimized for Helpdesk Performance
 * 
 * STRATEGI CACHE:
 * - Ticket list: 2 menit stale, 10 menit gc (sering berubah tapi tidak real-time exact)
 * - Ticket detail: 30 detik stale (user butuh data fresh)
 * - Messages: 0 stale (WebSocket handle update)
 * - Dashboard: 5 menit stale (agregat, tidak perlu instant)
 * - Master data: 30 menit stale (jarang berubah)
 */

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query"

// Cache time constants (in milliseconds)
export const CACHE_TIME = {
  // Ticket related
  TICKET_LIST: {
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 10 * 60 * 1000,        // 10 minutes
  },
  TICKET_DETAIL: {
    staleTime: 30 * 1000,          // 30 seconds
    gcTime: 5 * 60 * 1000,         // 5 minutes
  },
  TICKET_MESSAGES: {
    staleTime: 0,                   // Always stale (WebSocket updates)
    gcTime: 5 * 60 * 1000,         // 5 minutes
  },
  
  // Dashboard related
  DASHBOARD_STATS: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 30 * 60 * 1000,        // 30 minutes
  },
  DASHBOARD_RECENT: {
    staleTime: 1 * 60 * 1000,      // 1 minute
    gcTime: 5 * 60 * 1000,         // 5 minutes
  },
  
  // Master data (rarely changes)
  MASTER_DATA: {
    staleTime: 30 * 60 * 1000,     // 30 minutes
    gcTime: 60 * 60 * 1000,        // 60 minutes
  },
} as const

// Query key factory untuk konsistensi cache key
export const queryKeys = {
  // Tickets
  tickets: {
    all: ["tickets"] as const,
    lists: () => [...queryKeys.tickets.all, "list"] as const,
    list: (filters: Record<string, unknown>) => 
      [...queryKeys.tickets.lists(), filters] as const,
    details: () => [...queryKeys.tickets.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.tickets.details(), id] as const,
    thread: (id: number) => [...queryKeys.tickets.all, id, "thread"] as const,
    attachments: (id: number) => [...queryKeys.tickets.all, id, "attachments"] as const,
  },
  
  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    recent: (isAdmin: boolean) => [...queryKeys.dashboard.all, "recent", isAdmin] as const,
    myTickets: () => [...queryKeys.dashboard.all, "my-tickets"] as const,
    trends: (period?: string) => [...queryKeys.dashboard.all, "trends", period] as const,
  },
  
  // Master data
  master: {
    all: ["master"] as const,
    categories: () => [...queryKeys.master.all, "categories"] as const,
    teams: () => [...queryKeys.master.all, "teams"] as const,
    stages: () => [...queryKeys.master.all, "stages"] as const,
    types: () => [...queryKeys.master.all, "types"] as const,
    priorities: () => [...queryKeys.master.all, "priorities"] as const,
  },
} as const

// Create optimized query client
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default yang konservatif
        staleTime: 60 * 1000,        // 1 minute default
        gcTime: 5 * 60 * 1000,       // 5 minutes default
        refetchOnWindowFocus: false, // Internal app, tidak perlu
        refetchOnReconnect: true,    // Refetch setelah reconnect
        retry: (failureCount, error) => {
          // Jangan retry untuk 4xx errors
          if ((error as any)?.response?.status >= 400 && 
              (error as any)?.response?.status < 500) {
            return false
          }
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
      mutations: {
        retry: false, // Mutations tidak di-retry otomatis
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Log error untuk debugging
        console.error(`Query error [${query.queryKey}]:`, error)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        console.error(`Mutation error:`, error)
      },
    }),
  })
}

/**
 * Utility untuk invalidation yang tepat sasaran
 * JANGAN gunakan invalidateQueries dengan key terlalu luas
 */
export const invalidation = {
  // Ticket created → invalidate list dan dashboard
  onTicketCreated: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  },
  
  // Ticket updated → invalidate detail saja, list akan stale naturally
  onTicketUpdated: (queryClient: QueryClient, ticketId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
    // Mark list sebagai stale tapi jangan refetch
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.tickets.lists(),
      refetchType: 'none', // Jangan auto refetch
    })
  },
  
  // Status changed → invalidate detail + dashboard stats
  onStatusChanged: (queryClient: QueryClient, ticketId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
  },
  
  // New message → invalidate thread only
  onNewMessage: (queryClient: QueryClient, ticketId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.thread(ticketId) })
  },
  
  // Ticket deleted → remove dari cache + invalidate list
  onTicketDeleted: (queryClient: QueryClient, ticketId: number) => {
    queryClient.removeQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  },
}
