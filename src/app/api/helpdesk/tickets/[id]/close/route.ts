/**
 * POST /api/helpdesk/tickets/[id]/close - Close ticket
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
    return Response.json({ success: false, message: "Hanya admin yang dapat menutup ticket", data: null }, { status: 403 })
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  const body = await request.json().catch(() => ({}))

  // Find closing stage
  const closingStage = await prisma.stage.findFirst({
    where: { isClosing: true, isActive: true },
  })

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "CLOSED",
      endDate: new Date(),
      ...(closingStage ? { stageId: closingStage.id } : {}),
    },
    include: TICKET_INCLUDES,
  })

  await prisma.activityLog.create({
    data: {
      ticketId,
      employeeId: employee.id,
      activityType: "status_change",
      content: body.message || `Ticket ditutup oleh ${employee.name}`,
      metadata: { new_status: "CLOSED" },
    },
  })

  return Response.json({ success: true, data: formatTicketResponse(updated) })
}
