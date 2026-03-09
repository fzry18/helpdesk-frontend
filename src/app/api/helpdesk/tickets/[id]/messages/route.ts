/**
 * GET /api/helpdesk/tickets/[id]/messages - Get ticket messages
 * POST /api/helpdesk/tickets/[id]/messages - Post a message
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

  // Verify access
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    return Response.json({ success: false, message: "Ticket tidak ditemukan", data: null }, { status: 404 })
  }
  if (!isAdmin(employee) && ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10))
  const skip = (page - 1) * limit

  const whereClause: Record<string, unknown> = { ticketId }

  // Non-admin can't see internal messages
  if (!isAdmin(employee)) {
    whereClause.isInternal = false
  }

  const [messages, total] = await Promise.all([
    prisma.ticketMessage.findMany({
      where: whereClause,
      include: { author: true },
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
    }),
    prisma.ticketMessage.count({ where: whereClause }),
  ])

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
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page < Math.ceil(total / limit),
      has_prev: page > 1,
    },
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)

  // Verify access
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    return Response.json({ success: false, message: "Ticket tidak ditemukan", data: null }, { status: 404 })
  }
  if (!isAdmin(employee) && ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  const body = await request.json()
  if (!body.body) {
    return Response.json({ success: false, message: "body diperlukan", data: null }, { status: 400 })
  }

  // Only admins can post internal notes
  const isInternal = body.internal === true && isAdmin(employee)

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: employee.id,
      body: body.body,
      bodyPlain: body.body.replace(/<[^>]*>/g, ""),
      messageType: isInternal ? "note" : "comment",
      isInternal,
    },
    include: { author: true },
  })

  // Update ticket's updatedAt
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  })

  return Response.json({
    success: true,
    data: {
      id: message.id,
      body: message.body,
      body_plain: message.bodyPlain,
      author: message.author
        ? { id: message.author.id, name: message.author.name, email: message.author.email }
        : null,
      date: message.createdAt.toISOString(),
      create_date: message.createdAt.toISOString(),
      message_type: message.messageType,
      is_internal: message.isInternal,
      internal: message.isInternal,
    },
  }, { status: 201 })
}
