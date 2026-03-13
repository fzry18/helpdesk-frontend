/**
 * POST /api/helpdesk/auth/login
 * Login using Odoo Employee API, create local session
 */
import { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { createSession } from "@/lib/server/auth"
import { odooEmployeeLogin, odooFindEmployeeByNik, odooGetMe } from "@/lib/server/odoo-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nik, password } = body

    if (!nik || !password) {
      return Response.json(
        { success: false, message: "NIK dan password harus diisi", data: null },
        { status: 400 }
      )
    }

    // 1. Authenticate via Odoo Employee API
    const odooResult = await odooEmployeeLogin(nik, password)

    if (!odooResult.success || !odooResult.data) {
      // Detect PASSWORD_CHANGE_REQUIRED from Odoo (409)
      if (odooResult.code === "PASSWORD_CHANGE_REQUIRED") {
        return Response.json(
          {
            success: false,
            message: odooResult.message || "Password masih default, wajib ganti password.",
            error: "PASSWORD_CHANGE_REQUIRED",
            data: { nik },
          },
          { status: 409 }
        )
      }

      return Response.json(
        {
          success: false,
          message: odooResult.message || "NIK atau password salah",
          error: odooResult.code || "INVALID_CREDENTIALS",
          data: null,
        },
        { status: 401 }
      )
    }

    const odooData = odooResult.data

    // 2. Fetch detailed employee info from Odoo
    let department = ""
    let departmentId: number | null = null
    let jobTitle = ""
    let email = ""
    let phone = ""
    let gender: string | null = null

    try {
      const employeeRes = await odooFindEmployeeByNik(nik, odooData.token)
      if (employeeRes.success && employeeRes.data) {
        const emp = employeeRes.data
        department = emp.department_id?.[1] || ""
        departmentId = emp.department_id?.[0] || null
        jobTitle = emp.job_id?.[1] || ""
        email = emp.work_email || emp.email || ""
        phone = emp.mobile_phone || emp.phone_contact || ""
        gender = emp.gender || null
      }
    } catch (err) {
      console.warn("Failed to fetch employee details from Odoo:", err)
    }

    // 3. Check if super admin via Odoo auth/me
    let isSuperAdmin = false
    try {
      const meRes = await odooGetMe(odooData.token)
      if (meRes.success && meRes.data) {
        isSuperAdmin = meRes.data.is_super_admin === true
      }
    } catch (err) {
      console.warn("Failed to check super admin status from Odoo:", err)
    }

    // 4. Determine helpdesk role
    // - Odoo says super_admin → SUPER_ADMIN (always override)
    // - Locally assigned DEPT_ADMIN → keep DEPT_ADMIN
    // - Otherwise → USER
    const existingEmployee = await prisma.employee.findUnique({
      where: { nik: nik },
      select: { helpdeskRole: true },
    })

    let helpdeskRole: "USER" | "DEPT_ADMIN" | "SUPER_ADMIN" = "USER"
    if (isSuperAdmin) {
      helpdeskRole = "SUPER_ADMIN"
    } else if (existingEmployee?.helpdeskRole === "DEPT_ADMIN") {
      helpdeskRole = "DEPT_ADMIN"
    }

    // 5. Upsert employee in local database
    const employee = await prisma.employee.upsert({
      where: { nik: nik },
      update: {
        name: odooData.name,
        odooEmployeeId: odooData.employee_id,
        operatingUnit: odooData.operating_unit,
        department,
        departmentId,
        jobTitle,
        email,
        phone,
        gender,
        helpdeskRole,
        lastLoginAt: new Date(),
      },
      create: {
        nik: nik,
        name: odooData.name,
        odooEmployeeId: odooData.employee_id,
        operatingUnit: odooData.operating_unit,
        department,
        departmentId,
        jobTitle,
        email,
        phone,
        gender,
        helpdeskRole,
        lastLoginAt: new Date(),
      },
    })

    // 6. Create local session
    const session = await createSession(employee.id, odooData.token)

    // 7. Return response matching frontend expectations
    const response = NextResponse.json({
      success: true,
      data: {
        access_token: session.token,
        token_type: "Bearer",
        expires_at: session.expiresAt.toISOString(),
        employee: {
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
      },
    })

    response.cookies.set("access_token", session.token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return Response.json(
      { success: false, message: "Terjadi kesalahan pada server", data: null },
      { status: 500 }
    )
  }
}
