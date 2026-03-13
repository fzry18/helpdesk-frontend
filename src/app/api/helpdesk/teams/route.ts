/**
 * GET /api/helpdesk/teams - List teams
 * All admins can see all active teams (cross-department assignment supported)
 * Super_admin: all teams
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const where: Record<string, unknown> = { isActive: true }

  const teams = await prisma.team.findMany({
    where,
    include: {
      members: {
        include: { employee: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return Response.json({
    success: true,
    data: teams.map((t) => ({
      id: t.id,
      name: t.name,
      department_id: t.departmentId,
      department_name: t.departmentName,
      member_count: t.members.length,
      leader: t.members.find((m) => m.isLeader)
        ? {
            id: t.members.find((m) => m.isLeader)!.employee.id,
            name: t.members.find((m) => m.isLeader)!.employee.name,
          }
        : null,
      members: t.members.map((m) => ({
        id: m.id,
        employee_id: m.employee.id,
        name: m.employee.name,
        nik: m.employee.nik,
        email: m.employee.email,
        phone: m.employee.phone,
        department_id: m.employee.departmentId,
        department_name: m.employee.department,
        job_title: m.employee.jobTitle,
      })),
    })),
  })
}
