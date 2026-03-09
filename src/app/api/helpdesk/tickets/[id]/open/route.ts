/**
 * POST /api/helpdesk/tickets/[id]/open - Open ticket (Draft → In Progress)
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"
import { formatTicketResponse, TICKET_INCLUDES } from "../../helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isAdmin(employee)) {
    return Response.json({ success: false, message: "Hanya admin yang dapat membuka ticket", data: null }, { status: 403 })
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  const body = await request.json().catch(() => ({}))

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "IN_PROGRESS",
      startDate: new Date(),
    },
    include: TICKET_INCLUDES,
  })

  await prisma.activityLog.create({
    data: {
      ticketId,
      employeeId: employee.id,
      activityType: "status_change",
      content: body.message || `Ticket dibuka oleh ${employee.name}`,
      metadata: { old_status: "OPEN", new_status: "IN_PROGRESS" },
    },
  })

  return Response.json({ success: true, data: formatTicketResponse(updated) })
}
