import type { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/server/prisma"

export const messageRepository = {
  create: (data: Prisma.TicketMessageUncheckedCreateInput) =>
    prisma.ticketMessage.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

  listByTicketId: (ticketId: number) =>
    prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
}
