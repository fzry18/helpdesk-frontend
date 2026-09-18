import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/teams/[id]/members
 * Ambil daftar anggota teknisi dalam tim
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const teamId = parseInt(id)
  if (isNaN(teamId)) {
    return NextResponse.json({ success: false, message: "Invalid team ID" }, { status: 400 })
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
      },
    })

    if (!team) {
      return NextResponse.json({ success: false, message: "Tim tidak ditemukan" }, { status: 404 })
    }

    const employeeIds = team.members.map((m) => m.employeeId)
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        nik: true,
        name: true,
        email: true,
        department: true,
        jobTitle: true,
        operatingUnit: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        team: { id: team.id, name: team.name, email: team.email },
        members: employees,
      },
    })
  } catch (error) {
    console.error("[Team Members GET] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/helpdesk/teams/[id]/members
 * Tambahkan anggota ke dalam tim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (
    !payload ||
    (!payload.isSuperAdmin && !payload.roles.includes("SUPER_ADMIN"))
  ) {
    return NextResponse.json(
      { success: false, message: "Hanya Super Admin yang dapat mengelola anggota tim." },
      { status: 403 }
    )
  }

  const { id } = await params
  const teamId = parseInt(id)
  if (isNaN(teamId)) {
    return NextResponse.json({ success: false, message: "Invalid team ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { employee_id } = body

    if (!employee_id) {
      return NextResponse.json(
        { success: false, message: "Parameter employee_id wajib diisi." },
        { status: 400 }
      )
    }

    // Cek apakah karyawan ada
    const emp = await prisma.employee.findUnique({
      where: { id: employee_id },
      include: { userRoles: { include: { role: true } } },
    })
    if (!emp) {
      return NextResponse.json(
        { success: false, message: "Karyawan tidak ditemukan di database helpdesk." },
        { status: 404 }
      )
    }

    // Validasi bahwa karyawan memiliki role IT (SUPER_ADMIN, ADMIN_IT_SUPPORT, atau IT_SUPPORT)
    const itRoles = ["SUPER_ADMIN", "ADMIN_IT_SUPPORT", "IT_SUPPORT"]
    const empRoles = emp.userRoles.map((ur) => ur.role.slug)
    const hasItRole = empRoles.some((r) => itRoles.includes(r))
    if (!hasItRole) {
      return NextResponse.json(
        { success: false, message: `${emp.name} tidak memiliki role IT. Hanya staf dengan role SUPER_ADMIN, ADMIN_IT_SUPPORT, atau IT_SUPPORT yang dapat ditambahkan ke tim.` },
        { status: 400 }
      )
    }

    // Tambahkan ke team_members jika belum ada
    await prisma.teamMember.upsert({
      where: {
        teamId_employeeId: {
          teamId,
          employeeId: employee_id,
        },
      },
      update: {},
      create: {
        teamId,
        employeeId: employee_id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${emp.name} berhasil ditambahkan ke dalam tim.`,
    })
  } catch (error) {
    console.error("[Team Member Add] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/helpdesk/teams/[id]/members
 * Hapus anggota dari tim
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (
    !payload ||
    (!payload.isSuperAdmin && !payload.roles.includes("SUPER_ADMIN"))
  ) {
    return NextResponse.json(
      { success: false, message: "Hanya Super Admin yang dapat mengelola anggota tim." },
      { status: 403 }
    )
  }

  const { id } = await params
  const teamId = parseInt(id)
  if (isNaN(teamId)) {
    return NextResponse.json({ success: false, message: "Invalid team ID" }, { status: 400 })
  }

  try {
    const url = new URL(request.url)
    const employeeIdStr = url.searchParams.get("employee_id")
    const body = await request.json().catch(() => ({}))
    const employeeId = parseInt(employeeIdStr || body.employee_id)

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { success: false, message: "Parameter employee_id wajib diisi." },
        { status: 400 }
      )
    }

    await prisma.teamMember.deleteMany({
      where: {
        teamId,
        employeeId,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Anggota berhasil dihapus dari tim.",
    })
  } catch (error) {
    console.error("[Team Member Delete] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
