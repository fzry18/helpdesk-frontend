/**
 * GET /api/helpdesk/tickets/[id] - Get ticket detail
 * PATCH /api/helpdesk/tickets/[id] - Update ticket
 * DELETE /api/helpdesk/tickets/[id] - Delete ticket
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin, isSuperAdmin } from "@/lib/server/auth"
import { formatTicketResponse, TICKET_INCLUDES, parsePriority } from "../helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  if (isNaN(ticketId)) {
    return Response.json(
      { success: false, message: "ID ticket tidak valid", data: null },
      { status: 400 }
    )
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: TICKET_INCLUDES,
  })

  if (!ticket) {
    return Response.json(
      { success: false, message: "Ticket tidak ditemukan", data: null },
      { status: 404 }
    )
  }

  // Access control:
  // - User: only own tickets
  // - Dept Admin: own dept tickets + own tickets
  // - Super Admin: all tickets
  if (!isAdmin(employee)) {
    if (ticket.createdById !== employee.id) {
      return Response.json(
        { success: false, message: "Akses ditolak", data: null },
        { status: 403 }
      )
    }
  } else if (!isSuperAdmin(employee)) {
    // Dept Admin: can only see own dept + own tickets
    const isOwnTicket = ticket.createdById === employee.id
    const isSameDept = employee.departmentId && ticket.departmentId === employee.departmentId
    if (!isOwnTicket && !isSameDept) {
      return Response.json(
        { success: false, message: "Ticket dari department lain. Hanya Super Admin yang dapat mengakses.", data: null },
        { status: 403 }
      )
    }
  }

  return Response.json({
    success: true,
    data: formatTicketResponse(ticket),
  })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  if (isNaN(ticketId)) {
    return Response.json(
      { success: false, message: "ID ticket tidak valid", data: null },
      { status: 400 }
    )
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    return Response.json(
      { success: false, message: "Ticket tidak ditemukan", data: null },
      { status: 404 }
    )
  }

  // Only admin or ticket creator can update
  if (!isAdmin(employee) && ticket.createdById !== employee.id) {
    return Response.json(
      { success: false, message: "Akses ditolak", data: null },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = parsePriority(body.priority)
    if (body.category_id !== undefined) updateData.categoryId = body.category_id
    if (body.team_id !== undefined) updateData.teamId = body.team_id
    if (body.stage_id !== undefined) updateData.stageId = body.stage_id

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: TICKET_INCLUDES,
    })

    return Response.json({
      success: true,
      data: formatTicketResponse(updated),
    })
  } catch (error) {
    console.error("Update ticket error:", error)
    return Response.json(
      { success: false, message: "Gagal mengupdate ticket", data: null },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  if (!isAdmin(employee)) {
    return Response.json(
      { success: false, message: "Hanya admin yang dapat menghapus ticket", data: null },
      { status: 403 }
    )
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)

  await prisma.ticket.delete({ where: { id: ticketId } })

  return Response.json({
    success: true,
    message: "Ticket berhasil dihapus",
    data: null,
  })
}
