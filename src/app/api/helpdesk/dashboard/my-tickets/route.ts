/**
 * GET /api/helpdesk/dashboard/my-tickets - Get current user's ticket summary
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError } from "@/lib/server/auth"
import { formatTicketResponse, TICKET_INCLUDES } from "../../tickets/helpers"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const where = {
    OR: [
      { createdById: employee.id },
      { assignedToId: employee.id },
    ],
  }

  const [total, open, inProgress, closed, rejected, tickets] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: "OPEN" } }),
    prisma.ticket.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.ticket.count({
      where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } },
    }),
    prisma.ticket.count({ where: { ...where, status: "REJECTED" } }),
    prisma.ticket.findMany({
      where,
      include: TICKET_INCLUDES,
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
  ])

  return Response.json({
    success: true,
    data: {
      stats: { total, open, in_progress: inProgress, closed, rejected },
      tickets: tickets.map(formatTicketResponse),
    },
  })
}
