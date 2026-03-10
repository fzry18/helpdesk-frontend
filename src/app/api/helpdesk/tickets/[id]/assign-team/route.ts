/**
 * POST /api/helpdesk/tickets/[id]/assign-team - Assign ticket to a team (optionally with member)
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

  // Build update data - optionally include member assignment
  const updateData: Record<string, unknown> = { teamId: body.team_id }
  let assignee: { name: string } | null = null

  if (body.employee_id) {
    assignee = await prisma.employee.findUnique({
      where: { id: body.employee_id },
      select: { name: true },
    })
    if (assignee) {
      updateData.assignedToId = body.employee_id
      updateData.status = "IN_PROGRESS"
      updateData.startDate = new Date()
    }
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: updateData,
  })

  // Create combined activity log
  let logContent = `Ticket di-assign ke team ${team.name}`
  if (assignee) {
    logContent += `, ditangani oleh ${assignee.name}`
  }

  await prisma.activityLog.create({
    data: {
      ticketId,
      employeeId: employee.id,
      activityType: "team_assignment",
      content: body.message || logContent,
    },
  })

  return Response.json({
    success: true,
    data: {
      id: ticketId,
      team: { id: team.id, name: team.name },
      assignee: assignee ? { name: assignee.name } : null,
    },
  })
}
