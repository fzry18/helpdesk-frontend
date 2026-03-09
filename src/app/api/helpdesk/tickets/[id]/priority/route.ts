/**
 * POST /api/helpdesk/tickets/[id]/priority - Set ticket priority
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"
import { parsePriority } from "../../helpers"

type RouteContext = { params: Promise<{ id: string }> }

const PRIORITY_LABELS: Record<string, string> = {
  VERY_LOW: "Very Low",
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  VERY_HIGH: "Very High",
}

export async function POST(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isAdmin(employee)) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  const body = await request.json()

  const priority = parsePriority(body.priority)
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { priority },
  })

  return Response.json({
    success: true,
    data: {
      id: ticketId,
      priority: body.priority,
      priority_label: PRIORITY_LABELS[priority] || "Normal",
    },
  })
}
