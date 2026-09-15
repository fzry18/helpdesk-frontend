import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/dashboard - Dashboard statistics
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const canViewAll = payload.permissions.includes("ticket:view_all")
    const baseWhere = canViewAll ? {} : { createdById: payload.employeeId }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      total,
      openCount,
      closedCount,
      unassignedCount,
      waitingConfirmCount,
      todayCount,
      weekCount,
      monthCount,
      byStage,
    ] = await Promise.all([
      prisma.ticket.count({ where: baseWhere }),
      prisma.ticket.count({ where: { ...baseWhere, status: "open" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "closed" } }),
      prisma.ticket.count({ where: { ...baseWhere, assignedToId: null, status: "open" } }),
      prisma.ticket.count({ where: { ...baseWhere, waitingUserConfirmation: true, resolutionConfirmed: false } }),
      prisma.ticket.count({ where: { ...baseWhere, createdAt: { gte: todayStart } } }),
      prisma.ticket.count({ where: { ...baseWhere, createdAt: { gte: weekStart } } }),
      prisma.ticket.count({ where: { ...baseWhere, createdAt: { gte: monthStart } } }),
      prisma.stage.findMany({
        include: {
          _count: { select: { tickets: true } },
        },
        orderBy: { sequence: "asc" },
      }),
    ])

    // Priority breakdown
    const priorityCounts = await prisma.ticket.groupBy({
      by: ["priority"],
      where: baseWhere,
      _count: true,
    })

    const byPriority: Record<string, number> = {
      very_low: 0,
      low: 0,
      normal: 0,
      high: 0,
      very_high: 0,
    }
    const priorityMap: Record<string, string> = {
      "0": "very_low",
      "1": "low",
      "2": "normal",
      "3": "high",
      "4": "very_high",
    }
    for (const pc of priorityCounts) {
      const key = priorityMap[pc.priority] || "normal"
      byPriority[key] = pc._count
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total,
          open: openCount,
          closed: closedCount,
          unassigned: unassignedCount,
          waiting_confirmation: waitingConfirmCount,
        },
        period: {
          today: todayCount,
          this_week: weekCount,
          this_month: monthCount,
        },
        by_priority: byPriority,
        by_stage: byStage.map((s) => ({
          id: s.id,
          name: s.name,
          count: s._count.tickets,
        })),
      },
    })
  } catch (error) {
    console.error("[Dashboard] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
