/**
 * POST /api/helpdesk/tickets/[id]/assign-team - Assign ticket to a team
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isAdmin(employee)) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  const body = await request.json()

  if (!body.team_id) {
    return Response.json({ success: false, message: "team_id diperlukan", data: null }, { status: 400 })
  }

  const team = await prisma.team.findUnique({ where: { id: body.team_id } })
  if (!team) {
    return Response.json({ success: false, message: "Team tidak ditemukan", data: null }, { status: 404 })
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { teamId: body.team_id },
  })

  await prisma.activityLog.create({
    data: {
      ticketId,
      employeeId: employee.id,
      activityType: "assignment",
      content: body.message || `Ticket di-assign ke team ${team.name}`,
    },
  })

  return Response.json({
    success: true,
    data: { id: ticketId, team: { id: team.id, name: team.name } },
  })
}
