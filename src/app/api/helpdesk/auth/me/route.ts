/**
 * GET /api/helpdesk/auth/me - Get current authenticated employee
 * POST /api/helpdesk/auth/logout - Logout
 */
import { NextRequest } from "next/server"
import { getAuthEmployee, deleteSession, authError } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) {
    return authError("Tidak terautentikasi", 401)
  }

  return Response.json({
    success: true,
    data: {
      id: employee.id,
      name: employee.name,
      nik: employee.nik,
      department_id: employee.departmentId,
      department: employee.department || "",
      job_title: employee.jobTitle || "",
      email: employee.email || "",
      phone: employee.phone || "",
      is_manager: employee.isManager,
      helpdesk_role: employee.helpdeskRole.toLowerCase(),
      operating_unit: employee.operatingUnit || "",
    },
  })
}
