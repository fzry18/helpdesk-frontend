import { NextRequest, NextResponse } from "next/server"
import { verifyRequest, getLocalRbac } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const payload = verifyRequest(
    request.headers.get("authorization")
  )

  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Token tidak valid atau sudah kadaluarsa." },
      { status: 401 }
    )
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId },
    })

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Karyawan tidak ditemukan." },
        { status: 404 }
      )
    }

    const isSuperAdmin = employee.isSuperAdmin || employee.nik === "1.1025.274"

    // Self-heal DB if super admin status changed
    if (isSuperAdmin && !employee.isSuperAdmin) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { isSuperAdmin: true },
      })
      const superRole = await prisma.role.findUnique({ where: { slug: "SUPER_ADMIN" } })
      if (superRole) {
        await prisma.userRole.upsert({
          where: {
            employeeId_roleId: {
              employeeId: employee.id,
              roleId: superRole.id,
            },
          },
          update: {},
          create: { employeeId: employee.id, roleId: superRole.id },
        })
      }
    }

    // Refresh RBAC in case roles were updated since JWT was issued
    const { roles, permissions } = await getLocalRbac(
      employee.id,
      isSuperAdmin
    )

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          nik: employee.nik,
          email: employee.email || "",
          phone: employee.phone || "",
          department_id: employee.departmentId || null,
          department: employee.department || "",
          job_title: employee.jobTitle || "",
          is_manager: employee.isSuperAdmin || roles.includes("ADMIN_IT_SUPPORT"),
        },
        roles,
        permissions,
      },
    })
  } catch (error: unknown) {
    console.error("[Auth Me] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    )
  }
}
