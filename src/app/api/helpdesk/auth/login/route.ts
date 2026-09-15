import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  loginToOdoo,
  checkOdooAppAccess,
  upsertEmployee,
  getLocalRbac,
  signJwt,
  setOdooSession,
} from "@/lib/serverAuth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nik, password } = body

    if (!nik || !password) {
      return NextResponse.json(
        { success: false, message: "NIK dan password harus diisi." },
        { status: 400 }
      )
    }

    // 1. Login to Odoo Live
    const odooResult = await loginToOdoo(nik, password)

    if (!odooResult.success || !odooResult.data) {
      return NextResponse.json(
        {
          success: false,
          message: odooResult.message || "Login gagal. Periksa NIK dan password.",
        },
        { status: 401 }
      )
    }

    const d = odooResult.data
    const odooToken = d.token || d.access_token || ""

    // 2. Check if user has admin helpdesk access in Odoo
    // a. NIK seed (1.1025.274 is Super Admin as in stock-taking)
    // b. Odoo is_super_admin flag
    // c. managed_apps containing helpdesk
    // d. Odoo app-access endpoint check
    let isSuperAdmin = d.nik === "1.1025.274" || d.is_super_admin === true
    let isOdooAdmin = false

    if (
      !isSuperAdmin &&
      Array.isArray(d.managed_apps) &&
      (d.managed_apps.includes("helpdesk") ||
        d.managed_apps.includes("Helpdesk"))
    ) {
      isSuperAdmin = true
    }

    if (odooToken) {
      const appAccess = await checkOdooAppAccess(odooToken, d.nik, d.employee_id)
      if (appAccess.isSuperAdmin) {
        isSuperAdmin = true
      }
      if (appAccess.isAdmin) {
        isOdooAdmin = true
      }
    }

    // 3. Upsert employee to local DB
    const empRecord = await upsertEmployee({
      employee_id: d.employee_id,
      nik: d.nik,
      name: d.name,
      email: d.email,
      phone: d.phone,
      department_id: d.department_id,
      department: d.department,
      job_title: d.job_title,
      operating_unit: d.operating_unit,
      isSuperAdmin,
    })

    // Sync role in UserRole table
    try {
      const targetRoleSlug = isSuperAdmin
        ? "SUPER_ADMIN"
        : isOdooAdmin
        ? "ADMIN_IT_SUPPORT"
        : null

      if (targetRoleSlug) {
        const targetRole = await prisma.role.findUnique({
          where: { slug: targetRoleSlug },
        })
        if (targetRole) {
          await prisma.userRole.upsert({
            where: {
              employeeId_roleId: {
                employeeId: d.employee_id,
                roleId: targetRole.id,
              },
            },
            update: {},
            create: {
              employeeId: d.employee_id,
              roleId: targetRole.id,
            },
          })
        }
      }
    } catch (roleErr) {
      console.warn("[Auth Login] UserRole sync error:", roleErr)
    }

    // 4. Get local RBAC roles & permissions
    const { roles, permissions } = await getLocalRbac(d.employee_id, isSuperAdmin)

    // Store active Odoo session token
    if (odooToken) {
      setOdooSession(d.employee_id, odooToken)
    }

    // 5. Sign JWT token
    const token = signJwt({
      employeeId: d.employee_id,
      nik: d.nik,
      name: d.name,
      isSuperAdmin,
      roles,
      permissions,
      odooToken,
    })

    // 6. Log the login
    try {
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        null
      const userAgent = request.headers.get("user-agent")

      await prisma.loginLog.create({
        data: {
          employeeId: d.employee_id,
          nik: d.nik,
          name: d.name,
          ipAddress,
          userAgent,
        },
      })
    } catch (logError) {
      console.error("Failed to save login log:", logError)
    }

    // 7. Return response
    return NextResponse.json({
      success: true,
      data: {
        access_token: token,
        token_type: "Bearer",
        employee: {
          id: empRecord.id,
          name: empRecord.name,
          nik: empRecord.nik,
          email: empRecord.email || "",
          phone: empRecord.phone || "",
          department_id: empRecord.departmentId || null,
          department: empRecord.department || "",
          job_title: empRecord.jobTitle || "",
          operating_unit: empRecord.operatingUnit || d.operating_unit || "",
          is_manager: isSuperAdmin || roles.includes("ADMIN_IT_SUPPORT"),
          helpdesk_username: empRecord.nik,
        },
        roles,
        permissions,
      },
    })
  } catch (error: unknown) {
    console.error("[Auth Login] Error:", error)

    const axiosError = error as { response?: { status?: number; data?: { message?: string } }; message?: string }
    const status = axiosError.response?.status || 500
    const message =
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Terjadi kesalahan pada server."

    return NextResponse.json({ success: false, message }, { status })
  }
}
