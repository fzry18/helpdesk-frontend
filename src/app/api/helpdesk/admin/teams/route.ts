/**
 * GET  /api/helpdesk/admin/teams - List all teams with members
 * POST /api/helpdesk/admin/teams - Create team
 * Super Admin only.
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
  const departmentId = searchParams.get("department_id")
    ? parseInt(searchParams.get("department_id")!)
    : undefined
  const showInactive = searchParams.get("show_inactive") === "true"

  const where: Record<string, unknown> = {}
  if (!showInactive) where.isActive = true
  if (departmentId) where.departmentId = departmentId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { departmentName: { contains: search, mode: "insensitive" } },
    ]
  }

  const teams = await prisma.team.findMany({
    where,
    include: {
      members: {
        include: { employee: true },
      },
    },
    orderBy: [{ departmentName: "asc" }, { name: "asc" }],
  })

  return Response.json({
    success: true,
    data: teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      department_id: t.departmentId,
      department_name: t.departmentName,
      is_active: t.isActive,
      member_count: t.members.length,
      members: t.members.map((m) => ({
        id: m.id,
        employee_id: m.employee.id,
        name: m.employee.name,
        nik: m.employee.nik,
        email: m.employee.email,
        phone: m.employee.phone,
        department: m.employee.department,
        department_id: m.employee.departmentId,
        job_title: m.employee.jobTitle,
      })),
      created_at: t.createdAt.toISOString(),
    })),
  })
}

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
  const { name, department_id, department_name, description } = body

  if (!name?.trim()) {
    return Response.json(
      { success: false, message: "Nama tim harus diisi", data: null },
      { status: 400 }
    )
  }

  // Check uniqueness
  const existing = await prisma.team.findUnique({ where: { name: name.trim() } })
  if (existing) {
    return Response.json(
      { success: false, message: `Tim dengan nama "${name.trim()}" sudah ada`, data: null },
      { status: 409 }
    )
  }

  try {
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        departmentId: department_id || null,
        departmentName: department_name || null,
      },
    })

    return Response.json({
      success: true,
      message: `Tim "${team.name}" berhasil dibuat`,
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        department_id: team.departmentId,
        department_name: team.departmentName,
        is_active: team.isActive,
        member_count: 0,
        members: [],
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Create team error:", error)
    return Response.json(
      { success: false, message: "Gagal membuat tim", data: null },
      { status: 500 }
    )
  }
}
