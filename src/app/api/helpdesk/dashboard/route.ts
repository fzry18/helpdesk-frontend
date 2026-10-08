import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/dashboard - Real Dashboard statistics and trends
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
    const { searchParams } = new URL(request.url)
    const daysParam = parseInt(searchParams.get("days") || "30")
    const daysCount = [7, 14, 30].includes(daysParam) ? daysParam : 30

    const canViewAll = payload.permissions.includes("ticket:view_all")
    const baseWhere = canViewAll ? {} : { createdById: payload.employeeId }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // 1. Basic Counts
    const [
      total,
      openCount,
      closedCount,
      unassignedCount,
      waitingConfirmCount,
      inProgressCount,
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
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: "open",
          assignedToId: { not: null },
        },
      }),
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

    // 2. Real Dynamic Trend (Daily for selected N days)
    const trendStart = new Date(todayStart)
    trendStart.setDate(trendStart.getDate() - (daysCount - 1))

    const ticketsInPeriod = await prisma.ticket.findMany({
      where: {
        ...baseWhere,
        OR: [
          { createdAt: { gte: trendStart } },
          { updatedAt: { gte: trendStart }, status: "closed" },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]
    const trendData = []

    for (let i = daysCount - 1; i >= 0; i--) {
      const dayDate = new Date(todayStart)
      dayDate.setDate(dayDate.getDate() - i)
      const nextDay = new Date(dayDate)
      nextDay.setDate(nextDay.getDate() + 1)

      const dayLabel = `${dayDate.getDate()} ${monthNames[dayDate.getMonth()]}`

      const createdOnDay = ticketsInPeriod.filter(
        (t) => t.createdAt >= dayDate && t.createdAt < nextDay
      ).length

      const resolvedOnDay = ticketsInPeriod.filter(
        (t) => t.status === "closed" && t.updatedAt >= dayDate && t.updatedAt < nextDay
      ).length

      trendData.push({
        date: dayLabel,
        rawDate: dayDate.toISOString().split("T")[0],
        created: createdOnDay,
        resolved: resolvedOnDay,
      })
    }

    // 3. Real Priority Breakdown for Active Tickets
    const activePriorityCounts = await prisma.ticket.groupBy({
      by: ["priority"],
      where: { ...baseWhere, status: "open" },
      _count: true,
    })

    const priorityConfigMap: Record<string, { name: string; color: string }> = {
      "4": { name: "Mendesak", color: "#EF4444" },
      "3": { name: "Tinggi", color: "#F97316" },
      "2": { name: "Sedang", color: "#F59E0B" },
      "1": { name: "Rendah", color: "#10B981" },
    }

    const priorityDistribution = ["4", "3", "2", "1"].map((p) => {
      const found = activePriorityCounts.find((pc) => pc.priority === p)
      const cfg = priorityConfigMap[p]
      return {
        priority: p,
        name: cfg.name,
        value: found ? found._count : 0,
        color: cfg.color,
      }
    })

    // 4. Real Activity Timeline
    const [recentTicketsEvents, recentMessages] = await Promise.all([
      prisma.ticket.findMany({
        where: baseWhere,
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      }),
      prisma.ticketMessage.findMany({
        where: canViewAll
          ? {}
          : { ticket: { createdById: payload.employeeId }, internal: false },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true } },
          ticket: { select: { id: true, ticketNumber: true, subject: true } },
        },
      }),
    ])

    const activities: Array<{
      id: string
      type: "ticket_created" | "ticket_assigned" | "ticket_closed" | "comment_added" | "internal_note"
      user: string
      description: string
      timestamp: string
      ticketId: number
      ticketNumber: string
    }> = []

    for (const tk of recentTicketsEvents) {
      activities.push({
        id: `create-${tk.id}`,
        type: "ticket_created",
        user: tk.createdBy?.name || "User",
        description: `membuat tiket #${tk.ticketNumber}`,
        timestamp: tk.createdAt.toISOString(),
        ticketId: tk.id,
        ticketNumber: tk.ticketNumber,
      })

      if (tk.assignedTo) {
        activities.push({
          id: `assign-${tk.id}`,
          type: "ticket_assigned",
          user: tk.assignedTo.name,
          description: `ditugaskan menangani #${tk.ticketNumber}`,
          timestamp: tk.updatedAt.toISOString(),
          ticketId: tk.id,
          ticketNumber: tk.ticketNumber,
        })
      }

      if (tk.status === "closed") {
        activities.push({
          id: `close-${tk.id}`,
          type: "ticket_closed",
          user: tk.assignedTo?.name || tk.createdBy?.name || "Tim IT",
          description: `menutup tiket #${tk.ticketNumber}`,
          timestamp: tk.updatedAt.toISOString(),
          ticketId: tk.id,
          ticketNumber: tk.ticketNumber,
        })
      }
    }

    for (const msg of recentMessages) {
      if (msg.ticket) {
        activities.push({
          id: `msg-${msg.id}`,
          type: msg.internal ? "internal_note" : "comment_added",
          user: msg.author?.name || "Staf",
          description: msg.internal
            ? `menambahkan catatan internal di #${msg.ticket.ticketNumber}`
            : `mengirim pesan di #${msg.ticket.ticketNumber}`,
          timestamp: msg.createdAt.toISOString(),
          ticketId: msg.ticket.id,
          ticketNumber: msg.ticket.ticketNumber,
        })
      }
    }

    // Deduplicate and sort by timestamp desc, take top 8
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    const recentActivities = activities.slice(0, 8)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total,
          open: openCount,
          closed: closedCount,
          unassigned: unassignedCount,
          waiting_confirmation: waitingConfirmCount,
          in_progress: inProgressCount,
        },
        period: {
          today: todayCount,
          this_week: weekCount,
          this_month: monthCount,
        },
        trend: trendData,
        trend_days: daysCount,
        priority_distribution: priorityDistribution,
        activities: recentActivities,
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
