/**
 * GET /api/helpdesk/dashboard/recent - Recent tickets
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin, isSuperAdmin } from "@/lib/server/auth"
import { formatTicketResponse, TICKET_INCLUDES } from "../../tickets/helpers"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { searchParams } = request.nextUrl
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "10", 10))

  const where: Record<string, unknown> = {}
  if (!isAdmin(employee)) {
    where.createdById = employee.id
  } else if (!isSuperAdmin(employee)) {
    // Dept Admin: own dept tickets + own tickets
    if (employee.departmentId) {
      where.OR = [
        { createdById: employee.id },
        { departmentId: employee.departmentId },
      ]
    } else {
      where.createdById = employee.id
    }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: TICKET_INCLUDES,
    take: limit,
    orderBy: { createdAt: "desc" },
  })

  return Response.json({
    success: true,
    data: tickets.map(formatTicketResponse),
  })
}
