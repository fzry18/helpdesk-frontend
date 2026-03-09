/**
 * PUT /api/helpdesk/tickets/[id]/assign - Assign ticket to employee
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"
import { formatTicketResponse, TICKET_INCLUDES } from "../../helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isAdmin(employee)) {
    return Response.json({ success: false, message: "Hanya admin yang dapat assign ticket", data: null }, { status: 403 })
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  const body = await request.json()

  let assigneeId: number | null = null

  if (body.assign_to_me) {
    assigneeId = employee.id
  } else if (body.employee_id) {
    assigneeId = body.employee_id
  } else if (body.user_id) {
    assigneeId = body.user_id
  }

  if (!assigneeId) {
    return Response.json({ success: false, message: "employee_id atau assign_to_me diperlukan", data: null }, { status: 400 })
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: assigneeId,
      status: "IN_PROGRESS",
      startDate: new Date(),
    },
    include: TICKET_INCLUDES,
  })

  await prisma.activityLog.create({
    data: {
      ticketId,
      employeeId: employee.id,
      activityType: "assignment",
      content: `Ticket di-assign ke employee #${assigneeId}`,
    },
  })

  return Response.json({ success: true, data: formatTicketResponse(updated) })
}
