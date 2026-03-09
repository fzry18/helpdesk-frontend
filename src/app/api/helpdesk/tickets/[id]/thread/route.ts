/**
 * GET /api/helpdesk/tickets/[id]/thread - Get all ticket messages (no pagination)
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    return Response.json({ success: false, message: "Ticket tidak ditemukan", data: null }, { status: 404 })
  }
  if (!isAdmin(employee) && ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  const whereClause: Record<string, unknown> = { ticketId }
  if (!isAdmin(employee)) {
    whereClause.isInternal = false
  }

  const messages = await prisma.ticketMessage.findMany({
    where: whereClause,
    include: { author: true },
    orderBy: { createdAt: "asc" },
  })

  return Response.json({
    success: true,
    data: messages.map((msg) => ({
      id: msg.id,
      body: msg.body,
      body_plain: msg.bodyPlain,
      author: msg.author
        ? { id: msg.author.id, name: msg.author.name, email: msg.author.email }
        : null,
      date: msg.createdAt.toISOString(),
      create_date: msg.createdAt.toISOString(),
      message_type: msg.messageType,
      is_internal: msg.isInternal,
      internal: msg.isInternal,
    })),
  })
}
