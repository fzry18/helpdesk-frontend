/**
 * POST /api/helpdesk/admin/employees/role - Set employee helpdesk role
 * Super Admin only. Cannot set SUPER_ADMIN (that comes from Odoo).
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isSuperAdmin, getSessionOdooToken } from "@/lib/server/auth"
import { odooFindEmployeeByNik, parseOdooEmployeeName } from "@/lib/server/odoo-client"

export async function POST(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isSuperAdmin(employee)) {
    return Response.json(
      { success: false, message: "Hanya Super Admin yang dapat mengakses", data: null },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { nik, role } = body

  if (!nik || !role) {
    return Response.json(
      { success: false, message: "NIK dan role harus diisi", data: null },
      { status: 400 }
    )
  }

  // Only allow setting DEPT_ADMIN or USER via API
  const validRoles = ["DEPT_ADMIN", "USER"]
  const normalizedRole = role.toUpperCase()
  if (!validRoles.includes(normalizedRole)) {
    return Response.json(
      { success: false, message: "Role tidak valid. Hanya DEPT_ADMIN atau USER.", data: null },
      { status: 400 }
    )
  }

  // Prevent changing own role
  if (nik === employee.nik) {
    return Response.json(
      { success: false, message: "Tidak bisa mengubah role sendiri", data: null },
      { status: 400 }
    )
  }

  try {
    // Check if employee exists locally
    let targetEmployee = await prisma.employee.findUnique({
      where: { nik },
    })

    if (!targetEmployee) {
      // Employee not in local DB → fetch from Odoo and create
      const odooToken = await getSessionOdooToken(request)
      const odooRes = await odooFindEmployeeByNik(nik, odooToken)
      if (!odooRes.success || !odooRes.data) {
        return Response.json(
          { success: false, message: "Karyawan tidak ditemukan di Odoo", data: null },
          { status: 404 }
        )
      }

      const emp = odooRes.data
      targetEmployee = await prisma.employee.create({
        data: {
          nik: emp.nik,
          name: parseOdooEmployeeName(emp),
          odooEmployeeId: emp.id,
          department: emp.department_id?.[1] || "",
          departmentId: emp.department_id?.[0] || null,
          jobTitle: emp.job_id?.[1] || "",
          email: emp.work_email || emp.email || "",
          phone: emp.mobile_phone || emp.phone_contact || "",
          gender: emp.gender || null,
          operatingUnit: emp.operating_unit?.[1] || "",
          helpdeskRole: normalizedRole as "DEPT_ADMIN" | "USER",
        },
      })
    } else {
      // Don't demote a SUPER_ADMIN (that's managed by Odoo)
      if (targetEmployee.helpdeskRole === "SUPER_ADMIN" && normalizedRole !== "SUPER_ADMIN") {
        return Response.json(
          { success: false, message: "Tidak bisa mengubah role Super Admin. Role ini dikelola oleh sistem Odoo.", data: null },
          { status: 400 }
        )
      }

      // Refresh employee data from Odoo (department may have changed)
      const updateData: Record<string, unknown> = {
        helpdeskRole: normalizedRole as "DEPT_ADMIN" | "USER",
      }
      try {
        const odooToken = await getSessionOdooToken(request)
        const odooRes = await odooFindEmployeeByNik(nik, odooToken)
        if (odooRes.success && odooRes.data) {
          const emp = odooRes.data
          updateData.department = emp.department_id?.[1] || ""
          updateData.departmentId = emp.department_id?.[0] || null
          updateData.jobTitle = emp.job_id?.[1] || ""
          updateData.name = parseOdooEmployeeName(emp)
          updateData.email = emp.work_email || emp.email || ""
          updateData.phone = emp.mobile_phone || emp.phone_contact || ""
          updateData.operatingUnit = emp.operating_unit?.[1] || ""
        }
      } catch (err) {
        console.warn("Failed to refresh Odoo data during role change:", err)
      }

      targetEmployee = await prisma.employee.update({
        where: { nik },
        data: updateData,
      })
    }

    return Response.json({
      success: true,
      message: normalizedRole === "DEPT_ADMIN"
        ? `${targetEmployee.name} berhasil dijadikan Dept Admin`
        : `${targetEmployee.name} berhasil diubah menjadi User`,
      data: {
        id: targetEmployee.id,
        nik: targetEmployee.nik,
        name: targetEmployee.name,
        department_id: targetEmployee.departmentId,
        department: targetEmployee.department || "",
        job_title: targetEmployee.jobTitle || "",
        email: targetEmployee.email || "",
        helpdesk_role: targetEmployee.helpdeskRole.toLowerCase(),
      },
    })
  } catch (error) {
    console.error("Set role error:", error)
    return Response.json(
      { success: false, message: "Gagal mengubah role", data: null },
      { status: 500 }
    )
  }
}
