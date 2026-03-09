/**
 * POST /api/helpdesk/tickets/[id]/confirm-resolved - User confirms ticket is resolved
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError } from "@/lib/server/auth"
import { formatTicketResponse, TICKET_INCLUDES } from "../../helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    return Response.json({ success: false, message: "Ticket tidak ditemukan", data: null }, { status: 404 })
  }

  // Only ticket creator can confirm
  if (ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Hanya pembuat ticket yang dapat konfirmasi", data: null }, { status: 403 })
  }

  // Find closing stage
  const closingStage = await prisma.stage.findFirst({
    where: { isClosing: true, isActive: true },
  })

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "RESOLVED",
      resolutionConfirmed: true,
      waitingUserConfirmation: false,
      confirmationDate: new Date(),
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
      content: `Ticket dikonfirmasi selesai oleh ${employee.name}`,
      metadata: { new_status: "RESOLVED" },
    },
  })

  return Response.json({ success: true, data: formatTicketResponse(updated) })
}
