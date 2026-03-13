export const CACHE_TIME = {
  TICKET_LIST: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  TICKET_DETAIL: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  TICKET_MESSAGES: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  },
  DASHBOARD_STATS: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  DASHBOARD_RECENT: {
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  MASTER_DATA: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
} as const
