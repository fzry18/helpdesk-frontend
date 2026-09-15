import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/admin/technician-workload
 * Menghitung beban kerja tiket aktif per teknisi IT untuk memudahkan dispatching
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  // Only admin / IT support can view workload overview
  if (!payload.permissions.includes("ticket:assign") && !payload.permissions.includes("ticket:view_all")) {
    return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 })
  }

  try {
    // Find all technicians (users with role IT_SUPPORT, ADMIN_IT_SUPPORT, SUPER_ADMIN)
    const technicians = await prisma.employee.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              slug: { in: ["IT_SUPPORT", "ADMIN_IT_SUPPORT", "SUPER_ADMIN"] },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        nik: true,
        jobTitle: true,
        userRoles: {
          include: { role: true },
        },
      },
      orderBy: { name: "asc" },
    })

    // Get active ticket counts per technician
    const activeTickets = await prisma.ticket.findMany({
      where: { status: "open" },
      select: {
        id: true,
        assignedToId: true,
        priority: true,
        waitingUserConfirmation: true,
      },
    })

    const unassignedCount = activeTickets.filter((t) => !t.assignedToId).length

    const workloadMap = new Map<number, { active: number; urgent: number; waiting: number }>()
    for (const t of activeTickets) {
      if (t.assignedToId) {
        const current = workloadMap.get(t.assignedToId) || { active: 0, urgent: 0, waiting: 0 }
        current.active += 1
        if (t.priority === "3" || t.priority === "4") {
          current.urgent += 1
        }
        if (t.waitingUserConfirmation) {
          current.waiting += 1
        }
        workloadMap.set(t.assignedToId, current)
      }
    }

    const data = technicians.map((tech) => {
      const stats = workloadMap.get(tech.id) || { active: 0, urgent: 0, waiting: 0 }
      return {
        id: tech.id,
        name: tech.name,
        nik: tech.nik,
        job_title: tech.jobTitle,
        roles: tech.userRoles.map((ur) => ur.role.name),
        active_tickets: stats.active,
        urgent_tickets: stats.urgent,
        waiting_confirmation_tickets: stats.waiting,
      }
    })

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total_active_tickets: activeTickets.length,
        unassigned_tickets: unassignedCount,
      },
    })
  } catch (error) {
    console.error("[Workload API Error]:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
