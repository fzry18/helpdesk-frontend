/**
 * GET /api/helpdesk/dashboard/trends - Ticket trend data
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin, isSuperAdmin } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { searchParams } = request.nextUrl
  const period = searchParams.get("period") || "month"
  const teamId = searchParams.get("team_id")
    ? parseInt(searchParams.get("team_id")!)
    : undefined

  // Determine date range
  const now = new Date()
  let startDate: Date
  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "quarter":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    case "month":
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  const baseWhere: Record<string, unknown> = {
    createdAt: { gte: startDate },
  }
  if (!isAdmin(employee)) {
    baseWhere.createdById = employee.id
  } else if (!isSuperAdmin(employee)) {
    // Dept Admin: own dept tickets + own tickets
    if (employee.departmentId) {
      baseWhere.OR = [
        { createdById: employee.id },
        { departmentId: employee.departmentId },
      ]
    } else {
      baseWhere.createdById = employee.id
    }
  }
  if (teamId) baseWhere.teamId = teamId

  // Get all tickets in range
  const tickets = await prisma.ticket.findMany({
    where: baseWhere,
    select: {
      createdAt: true,
      status: true,
      endDate: true,
    },
  })

  // Group by date
  const trendMap = new Map<
    string,
    { created: number; resolved: number }
  >()

  // Initialize all dates in range
  const current = new Date(startDate)
  while (current <= now) {
    const dateStr = current.toISOString().slice(0, 10)
    trendMap.set(dateStr, { created: 0, resolved: 0 })
    current.setDate(current.getDate() + 1)
  }

  for (const ticket of tickets) {
    const dateStr = ticket.createdAt.toISOString().slice(0, 10)
    const entry = trendMap.get(dateStr)
    if (entry) entry.created++

    if (
      ticket.endDate &&
      (ticket.status === "RESOLVED" || ticket.status === "CLOSED")
    ) {
      const resolvedDate = ticket.endDate.toISOString().slice(0, 10)
      const resolvedEntry = trendMap.get(resolvedDate)
      if (resolvedEntry) resolvedEntry.resolved++
    }
  }

  const trends = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      full_date: date,
      created: data.created,
      resolved: data.resolved,
    }))

  return Response.json({
    success: true,
    data: trends,
  })
}
