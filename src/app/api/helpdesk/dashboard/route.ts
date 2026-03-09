/**
 * GET /api/helpdesk/dashboard - Dashboard statistics
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin, isSuperAdmin } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { searchParams } = request.nextUrl
  const teamId = searchParams.get("team_id")
    ? parseInt(searchParams.get("team_id")!)
    : undefined

  // Base where clause with role-based visibility
  const baseWhere: Record<string, unknown> = {}
  if (!isAdmin(employee)) {
    // User: only own tickets
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
  // Super Admin: no filter (sees all)
  if (teamId) baseWhere.teamId = teamId

  // Summary counts
  const [total, open, inProgress, waitingConfirmation, resolved, closed, rejected] =
    await Promise.all([
      prisma.ticket.count({ where: baseWhere }),
      prisma.ticket.count({ where: { ...baseWhere, status: "OPEN" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "WAITING_CONFIRMATION" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "RESOLVED" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "CLOSED" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "REJECTED" } }),
    ])

  // This period
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [today, thisWeek, thisMonth] = await Promise.all([
    prisma.ticket.count({
      where: { ...baseWhere, createdAt: { gte: todayStart } },
    }),
    prisma.ticket.count({
      where: { ...baseWhere, createdAt: { gte: weekStart } },
    }),
    prisma.ticket.count({
      where: { ...baseWhere, createdAt: { gte: monthStart } },
    }),
  ])

  // By priority
  const [veryLow, low, normal, high, veryHigh] = await Promise.all([
    prisma.ticket.count({ where: { ...baseWhere, priority: "VERY_LOW" } }),
    prisma.ticket.count({ where: { ...baseWhere, priority: "LOW" } }),
    prisma.ticket.count({ where: { ...baseWhere, priority: "NORMAL" } }),
    prisma.ticket.count({ where: { ...baseWhere, priority: "HIGH" } }),
    prisma.ticket.count({ where: { ...baseWhere, priority: "VERY_HIGH" } }),
  ])

  // By stage
  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { sequence: "asc" },
  })
  const byStage = await Promise.all(
    stages.map(async (stage) => ({
      id: stage.id,
      name: stage.name,
      count: await prisma.ticket.count({
        where: { ...baseWhere, stageId: stage.id },
      }),
    }))
  )

  // Unassigned
  const unassigned = await prisma.ticket.count({
    where: {
      ...baseWhere,
      assignedToId: null,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  })

  // By category type
  const [systemCount, helperCount] = await Promise.all([
    prisma.ticket.count({ where: { ...baseWhere, ticketCategoryType: "SYSTEM" } }),
    prisma.ticket.count({ where: { ...baseWhere, ticketCategoryType: "HELPER" } }),
  ])

  return Response.json({
    success: true,
    data: {
      summary: {
        total,
        open: open + inProgress,
        closed: resolved + closed,
        unassigned,
        waiting_confirmation: waitingConfirmation,
        rejected,
      },
      by_category_type: { system: systemCount, helper: helperCount },
      period: {
        today,
        this_week: thisWeek,
        this_month: thisMonth,
      },
      by_priority: {
        very_low: veryLow,
        low,
        normal,
        high,
        very_high: veryHigh,
      },
      by_stage: byStage,
    },
  })
}
