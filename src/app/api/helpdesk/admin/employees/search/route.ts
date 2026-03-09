/**
 * GET /api/helpdesk/admin/employees/search?q=xxx - Search Odoo employees
 * Super Admin only. For the "Add Admin" dialog.
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isSuperAdmin, getSessionOdooToken } from "@/lib/server/auth"
import {
  odooSearchEmployeeByName,
  odooSearchEmployeeByNik,
  parseOdooEmployeeName,
} from "@/lib/server/odoo-client"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isSuperAdmin(employee)) {
    return Response.json(
      { success: false, message: "Hanya Super Admin yang dapat mengakses", data: null },
      { status: 403 }
    )
  }

  const q = request.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return Response.json({
      success: true,
      message: "Masukkan minimal 2 karakter untuk pencarian",
      data: [],
    })
  }

  try {
    // Detect if query looks like NIK (contains digits and dots like 1.1025.274)
    const isNikPattern = /^[\d.]+$/.test(q)

    // Get Odoo token from session for authenticated API calls
    const odooToken = await getSessionOdooToken(request)

    const odooRes = isNikPattern
      ? await odooSearchEmployeeByNik(q, odooToken)
      : await odooSearchEmployeeByName(q, odooToken)

    if (!odooRes.success || !odooRes.data) {
      return Response.json({
        success: true,
        message: "Tidak ditemukan",
        data: [],
      })
    }

    // Get local employee data to enrich with role info
    const niks = odooRes.data.map((e) => e.nik).filter(Boolean)
    const localEmployees = niks.length > 0
      ? await prisma.employee.findMany({
          where: { nik: { in: niks } },
          select: { nik: true, helpdeskRole: true },
        })
      : []

    const localRoleMap = new Map(localEmployees.map((e) => [e.nik, e.helpdeskRole]))

    const results = odooRes.data
      .filter((emp) => emp.nik) // Skip employees without NIK
      .map((emp) => ({
        odoo_id: emp.id,
        nik: emp.nik,
        name: parseOdooEmployeeName(emp),
        department: emp.department_id?.[1] || "",
        department_id: emp.department_id?.[0] || null,
        job_title: emp.job_id?.[1] || "",
        email: emp.work_email || emp.email || "",
        phone: emp.mobile_phone || emp.phone_contact || "",
        operating_unit: emp.operating_unit?.[1] || "",
        helpdesk_role: localRoleMap.has(emp.nik)
          ? localRoleMap.get(emp.nik)!.toLowerCase()
          : "user",
      }))

    return Response.json({
      success: true,
      message: `Ditemukan ${results.length} karyawan`,
      data: results,
    })
  } catch (error) {
    console.error("Search employees error:", error)
    return Response.json(
      { success: false, message: "Gagal mencari karyawan", data: null },
      { status: 500 }
    )
  }
}
