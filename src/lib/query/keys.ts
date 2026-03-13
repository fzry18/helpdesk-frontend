export const queryKeys = {
  tickets: {
    all: ["tickets"] as const,
    lists: () => [...queryKeys.tickets.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.tickets.lists(), filters] as const,
    details: () => [...queryKeys.tickets.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.tickets.details(), id] as const,
    thread: (id: number) => [...queryKeys.tickets.all, id, "thread"] as const,
    attachments: (id: number) => [...queryKeys.tickets.all, id, "attachments"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    recent: (isAdmin: boolean) => [...queryKeys.dashboard.all, "recent", isAdmin] as const,
    myTickets: () => [...queryKeys.dashboard.all, "my-tickets"] as const,
    trends: (period?: string) => [...queryKeys.dashboard.all, "trends", period] as const,
  },
  master: {
    all: ["master"] as const,
    categories: () => [...queryKeys.master.all, "categories"] as const,
    teams: () => [...queryKeys.master.all, "teams"] as const,
    stages: () => [...queryKeys.master.all, "stages"] as const,
    types: () => [...queryKeys.master.all, "types"] as const,
    priorities: () => [...queryKeys.master.all, "priorities"] as const,
  },
} as const
