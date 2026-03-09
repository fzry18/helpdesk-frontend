/**
 * GET /api/helpdesk/admin/employees - List employees with admin roles
 * Super Admin only
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isSuperAdmin } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isSuperAdmin(employee)) {
    return Response.json(
      { success: false, message: "Hanya Super Admin yang dapat mengakses", data: null },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get("search") || undefined
  const department = searchParams.get("department") || undefined

  const where: Record<string, unknown> = {
    helpdeskRole: { in: ["DEPT_ADMIN", "SUPER_ADMIN"] },
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nik: { contains: search, mode: "insensitive" } },
    ]
  }

  if (department) {
    where.department = { contains: department, mode: "insensitive" }
  }

  const admins = await prisma.employee.findMany({
    where,
    orderBy: [{ helpdeskRole: "desc" }, { name: "asc" }],
  })

  return Response.json({
    success: true,
    data: admins.map((emp) => ({
      id: emp.id,
      nik: emp.nik,
      name: emp.name,
      department_id: emp.departmentId,
      department: emp.department || "",
      job_title: emp.jobTitle || "",
      email: emp.email || "",
      phone: emp.phone || "",
      helpdesk_role: emp.helpdeskRole.toLowerCase(),
      operating_unit: emp.operatingUnit || "",
      is_active: emp.isActive,
      last_login_at: emp.lastLoginAt?.toISOString() || null,
    })),
  })
}
