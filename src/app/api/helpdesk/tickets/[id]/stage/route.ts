/**
 * PUT /api/helpdesk/tickets/[id]/stage - Update ticket stage
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
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  const body = await request.json()

  if (!body.stage_id) {
    return Response.json({ success: false, message: "stage_id diperlukan", data: null }, { status: 400 })
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { stageId: body.stage_id },
    include: TICKET_INCLUDES,
  })

  return Response.json({ success: true, data: formatTicketResponse(updated) })
}
