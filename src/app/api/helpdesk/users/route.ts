import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/users - List employees with roles
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = url.searchParams.get("search") || ""
  const roleFilter = url.searchParams.get("role") || ""

  try {
    const employees = await prisma.employee.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { nik: { contains: search, mode: "insensitive" } },
              { department: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      take: 100,
      orderBy: { name: "asc" },
    })

    const data = employees.map((emp) => {
      const roleSlugs = emp.userRoles.map((r) => r.role.slug)
      if (emp.isSuperAdmin && !roleSlugs.includes("SUPER_ADMIN")) {
        roleSlugs.unshift("SUPER_ADMIN")
      }
      if (roleSlugs.length === 0) {
        roleSlugs.push("USER")
      }

      return {
        id: emp.id,
        nik: emp.nik,
        name: emp.name,
        email: emp.email || "",
        department: emp.department || "-",
        job_title: emp.jobTitle || "-",
        operating_unit: emp.operatingUnit || "-",
        is_super_admin: emp.isSuperAdmin,
        role: roleSlugs[0] || "USER",
        roles: roleSlugs,
      }
    })

    const filteredData = roleFilter
      ? data.filter((emp) => emp.roles.includes(roleFilter))
      : data

    return NextResponse.json({
      success: true,
      data: filteredData,
    })
  } catch (error) {
    console.error("[Users List] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/helpdesk/users - Assign role to an employee
 * Hanya bisa dilakukan oleh SUPER_ADMIN
 */
export async function PUT(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  // Super Admin check
  if (!payload.roles.includes("SUPER_ADMIN") && !payload.isSuperAdmin) {
    return NextResponse.json(
      { success: false, message: "Hanya Super Admin yang memiliki hak mengubah role pengguna." },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { employee_id, role_slug } = body

    if (!employee_id || !role_slug) {
      return NextResponse.json(
        { success: false, message: "Parameter employee_id dan role_slug wajib diisi." },
        { status: 400 }
      )
    }

    const targetRole = await prisma.role.findUnique({
      where: { slug: role_slug },
    })

    if (!targetRole) {
      return NextResponse.json(
        { success: false, message: `Role '${role_slug}' tidak ditemukan.` },
        { status: 400 }
      )
    }

    const isSuper = role_slug === "SUPER_ADMIN"

    // Update isSuperAdmin flag in employee record
    await prisma.employee.update({
      where: { id: employee_id },
      data: { isSuperAdmin: isSuper },
    })

    // Reset old roles and assign the new single primary role
    await prisma.userRole.deleteMany({
      where: { employeeId: employee_id },
    })

    await prisma.userRole.create({
      data: {
        employeeId: employee_id,
        roleId: targetRole.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Role berhasil diubah menjadi ${targetRole.name}.`,
    })
  } catch (error) {
    console.error("[Users Role Assign] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
