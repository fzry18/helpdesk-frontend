/**
 * POST /api/helpdesk/tickets/[id]/reject - Reject ticket
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
    return Response.json({ success: false, message: "Hanya admin yang dapat menolak ticket", data: null }, { status: 403 })
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  const body = await request.json()

  if (!body.reason) {
    return Response.json({ success: false, message: "Alasan penolakan harus diisi", data: null }, { status: 400 })
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "REJECTED",
      isRejected: true,
      rejectionReason: body.reason,
      rejectedDate: new Date(),
    },
    include: TICKET_INCLUDES,
  })

  await prisma.activityLog.create({
    data: {
      ticketId,
      employeeId: employee.id,
      activityType: "status_change",
      content: `Ticket ditolak: ${body.reason}`,
      metadata: { new_status: "REJECTED", reason: body.reason },
    },
  })

  return Response.json({ success: true, data: formatTicketResponse(updated) })
}
