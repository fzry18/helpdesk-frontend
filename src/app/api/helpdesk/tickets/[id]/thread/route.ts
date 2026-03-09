/**
 * GET /api/helpdesk/tickets/[id]/thread - Get all ticket messages + activity logs
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

  const msgWhere: Record<string, unknown> = { ticketId }
  if (!isAdmin(employee)) {
    msgWhere.isInternal = false
  }

  const [messages, activityLogs] = await Promise.all([
    prisma.ticketMessage.findMany({
      where: msgWhere,
      include: { author: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activityLog.findMany({
      where: { ticketId },
      include: { employee: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const formattedMessages = messages.map((msg) => ({
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
  }))

  // Map activity type to display label
  const activityLabel: Record<string, string> = {
    status_change: "🔄 Status Update",
    assignment: "👤 Member Assignment",
    team_assignment: "👥 Team Assignment",
    progress: "📋 Progress Update",
    note: "📋 Catatan",
  }

  const formattedLogs = activityLogs.map((log) => ({
    id: `activity-${log.id}`,
    body: `${activityLabel[log.activityType] || "📋 Progress Update"}: ${log.content}`,
    body_plain: `${activityLabel[log.activityType] || "📋 Progress Update"}: ${log.content}`,
    author: { id: log.employee.id, name: log.employee.name, email: log.employee.email },
    date: log.createdAt.toISOString(),
    create_date: log.createdAt.toISOString(),
    message_type: "activity_log",
    is_internal: true,
    internal: true,
    is_activity_log: true,
  }))

  // Merge and sort by date
  const combined = [...formattedMessages, ...formattedLogs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return Response.json({
    success: true,
    data: combined,
  })
}
