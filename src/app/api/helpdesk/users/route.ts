import { NextRequest, NextResponse } from "next/server"
import { verifyRequest, getOdooSession, syncOdooAppAccess } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/users - List employees with roles
 * Khusus diakses oleh SUPER_ADMIN
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  // Khusus Super Admin
  if (!payload.roles.includes("SUPER_ADMIN") && !payload.isSuperAdmin) {
    return NextResponse.json(
      { success: false, message: "Hanya Super Admin yang memiliki hak mengakses Manajemen Pengguna." },
      { status: 403 }
    )
  }

  const url = new URL(request.url)
  const search = url.searchParams.get("search") || ""
  const roleFilter = url.searchParams.get("role") || ""

  try {
    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          // Hanya tampilkan staf (Super Admin ATAU memiliki role staf aktif)
          {
            OR: [
              { isSuperAdmin: true },
              {
                userRoles: {
                  some: {
                    role: {
                      slug: { in: ["SUPER_ADMIN", "ADMIN_IT_SUPPORT", "IT_SUPPORT"] },
                    },
                  },
                },
              },
            ],
          },
          ...(search
            ? [
                {
                  OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { nik: { contains: search, mode: "insensitive" as const } },
                    { department: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              ]
            : []),
        ],
      },
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

    // 2-way sync ke Odoo app-access jika diubah ke atau dari SUPER_ADMIN
    const odooToken = payload.odooToken || getOdooSession(payload.employeeId)
    const empData = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: { nik: true },
    })
    if (odooToken && empData?.nik) {
      syncOdooAppAccess(odooToken, employee_id, empData.nik, isSuper).catch((e) =>
        console.warn("[Users PUT syncOdooAppAccess warning]:", e)
      )
    }

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

/**
 * DELETE /api/helpdesk/users?id=... - Delete employee and their roles
 * Hanya bisa dilakukan oleh SUPER_ADMIN
 */
export async function DELETE(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  // Super Admin check
  if (!payload.roles.includes("SUPER_ADMIN") && !payload.isSuperAdmin) {
    return NextResponse.json(
      { success: false, message: "Hanya Super Admin yang memiliki hak menghapus pengguna." },
      { status: 403 }
    )
  }

  const url = new URL(request.url)
  const idParam = url.searchParams.get("id")
  const employeeId = idParam ? parseInt(idParam, 10) : null

  if (!employeeId || isNaN(employeeId)) {
    return NextResponse.json(
      { success: false, message: "Parameter ID pengguna tidak valid." },
      { status: 400 }
    )
  }

  // Prevent self-deletion
  if (payload.employeeId === employeeId) {
    return NextResponse.json(
      { success: false, message: "Anda tidak dapat menghapus akun Anda sendiri." },
      { status: 400 }
    )
  }

  try {
    const targetEmp = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!targetEmp) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      )
    }

    // 2-way sync: hapus dari Odoo app-access jika sebelumnya Super Admin
    const odooToken = payload.odooToken || getOdooSession(payload.employeeId)
    if (odooToken && targetEmp.nik) {
      syncOdooAppAccess(odooToken, employeeId, targetEmp.nik, false).catch((e) =>
        console.warn("[Users DELETE syncOdooAppAccess warning]:", e)
      )
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unassign tiket aktif yang sedang ditugaskan ke staf ini
      await tx.ticket.updateMany({
        where: {
          assignedToId: employeeId,
          status: { not: "closed" },
        },
        data: { assignedToId: null },
      })

      // 2. Cabut dari keanggotaan tim penangan (TeamMember)
      await tx.teamMember.deleteMany({
        where: { employeeId },
      })

      // 3. Cabut role khusus staf (UserRole)
      await tx.userRole.deleteMany({
        where: { employeeId },
      })

      // 4. Ubah status isSuperAdmin menjadi false
      await tx.employee.update({
        where: { id: employeeId },
        data: { isSuperAdmin: false },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Akses staf untuk ${targetEmp.name} (${targetEmp.nik}) berhasil dicabut. Akun kembali menjadi pengguna biasa (USER) dan riwayat tiket tetap tersimpan.`,
    })
  } catch (error) {
    console.error("[Users Delete] Error:", error)
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mencabut akses pengguna." },
      { status: 500 }
    )
  }
}

