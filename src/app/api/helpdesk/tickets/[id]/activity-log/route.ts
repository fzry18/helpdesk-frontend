/**
 * POST /api/helpdesk/tickets/[id]/activity-log - Post activity log
 * POST /api/helpdesk/tickets/[id]/priority - Set priority
 * PUT /api/helpdesk/tickets/[id]/stage - Update stage
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

  if (!body.content) {
    return Response.json({ success: false, message: "content diperlukan", data: null }, { status: 400 })
  }

  const log = await prisma.activityLog.create({
    data: {
      ticketId,
      employeeId: employee.id,
      activityType: body.activity_type || "progress",
      content: body.content,
    },
  })

  return Response.json({
    success: true,
    data: {
      id: log.id,
      content: log.content,
      activity_type: log.activityType,
      create_date: log.createdAt.toISOString(),
    },
  })
}
