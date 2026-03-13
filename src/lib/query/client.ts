import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { queryKeys } from "./keys"

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (
            (error as { response?: { status?: number } })?.response?.status !== undefined &&
            (error as { response?: { status?: number } })?.response?.status! >= 400 &&
            (error as { response?: { status?: number } })?.response?.status! < 500
          ) {
            return false
          }
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        console.error(`Query error [${query.queryKey}]:`, error)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        console.error("Mutation error:", error)
      },
    }),
  })
}

export const invalidation = {
  onTicketCreated: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  },
  onTicketUpdated: (queryClient: QueryClient, ticketId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
    queryClient.invalidateQueries({
      queryKey: queryKeys.tickets.lists(),
      refetchType: "none",
    })
  },
  onStatusChanged: (queryClient: QueryClient, ticketId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
  },
  onNewMessage: (queryClient: QueryClient, ticketId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.thread(ticketId) })
  },
  onTicketDeleted: (queryClient: QueryClient, ticketId: number) => {
    queryClient.removeQueries({ queryKey: queryKeys.tickets.detail(ticketId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.lists() })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  },
}
