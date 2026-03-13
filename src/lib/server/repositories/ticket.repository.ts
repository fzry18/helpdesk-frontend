import type { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/server/prisma"

export const ticketIncludes = {
  createdBy: true,
  assignedTo: true,
  category: true,
  team: true,
  stage: true,
  tags: {
    include: { tag: true },
  },
  attachments: true,
} as const

export const ticketRepository = {
  findById: (id: number) =>
    prisma.ticket.findUnique({
      where: { id },
      include: ticketIncludes,
    }),

  findByIdBasic: (id: number) => prisma.ticket.findUnique({ where: { id } }),

  updateById: (id: number, data: Prisma.TicketUpdateInput) =>
    prisma.ticket.update({
      where: { id },
      data,
      include: ticketIncludes,
    }),

  create: (data: Prisma.TicketCreateInput) =>
    prisma.ticket.create({
      data,
      include: ticketIncludes,
    }),

  deleteById: (id: number) => prisma.ticket.delete({ where: { id } }),

  findClosingStageId: async () => {
    const stage = await prisma.stage.findFirst({
      where: { isClosing: true, isActive: true },
      select: { id: true },
    })
    return stage?.id ?? null
  },

  findTeamById: (id: number) => prisma.team.findUnique({ where: { id } }),

  findEmployeeNameById: (id: number) =>
    prisma.employee.findUnique({ where: { id }, select: { name: true } }),
}
