import type { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/server/prisma"

export const activityLogRepository = {
  create: (data: Prisma.ActivityLogUncheckedCreateInput) =>
    prisma.activityLog.create({ data }),

  listByTicketId: (ticketId: number) =>
    prisma.activityLog.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
}
