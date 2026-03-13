import type { Prisma } from "@/generated/prisma"

import { ticketRepository } from "@/lib/server/repositories/ticket.repository"

export const serverTicketService = {
  getById: (ticketId: number) => ticketRepository.findById(ticketId),

  create: (data: Prisma.TicketCreateInput) => ticketRepository.create(data),

  update: (ticketId: number, data: Prisma.TicketUpdateInput) =>
    ticketRepository.updateById(ticketId, data),

  remove: (ticketId: number) => ticketRepository.deleteById(ticketId),
}
