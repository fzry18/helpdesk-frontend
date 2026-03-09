/**
 * GET /api/helpdesk/admin/teams/departments - List Odoo departments
 * Super Admin only. For the "Create Team" dialog department selector.
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isSuperAdmin, getSessionOdooToken } from "@/lib/server/auth"
import { odooGetDepartments } from "@/lib/server/odoo-client"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isSuperAdmin(employee)) {
    return Response.json(
      { success: false, message: "Hanya Super Admin yang dapat mengakses", data: null },
      { status: 403 }
    )
  }

  try {
    const odooToken = await getSessionOdooToken(request)
    const odooRes = await odooGetDepartments(odooToken)

    if (!odooRes.success || !odooRes.data) {
      return Response.json({
        success: false,
        message: "Gagal mengambil data department dari Odoo",
        data: null,
      }, { status: 502 })
    }

    // Count teams per department from local DB
    const teamCounts = await prisma.team.groupBy({
      by: ["departmentId"],
      where: { isActive: true, departmentId: { not: null } },
      _count: { id: true },
    })
    const countMap = new Map(teamCounts.map((t) => [t.departmentId!, t._count.id]))

    const departments = odooRes.data
      .map((dept) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code || null,
        total_employee: dept.total_employee,
        team_count: countMap.get(dept.id) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return Response.json({
      success: true,
      data: departments,
    })
  } catch (error) {
    console.error("Get departments error:", error)
    return Response.json(
      { success: false, message: "Gagal mengambil data department", data: null },
      { status: 500 }
    )
  }
}
