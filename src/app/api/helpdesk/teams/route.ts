import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function checkSuperAdminOnly(payload: any) {
  return (
    payload &&
    (payload.isSuperAdmin || payload.roles?.includes("SUPER_ADMIN"))
  )
}

export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }
  const teams = await prisma.team.findMany({
    include: {
      _count: { select: { members: true } },
      members: true,
    },
    orderBy: { name: "asc" },
  })

  // Fetch employee details for members
  const allEmployeeIds = Array.from(new Set(teams.flatMap((t) => t.members.map((m) => m.employeeId))))
  const employees = await prisma.employee.findMany({
    where: { id: { in: allEmployeeIds } },
    select: { id: true, nik: true, name: true, email: true, jobTitle: true, department: true },
  })
  const empMap = new Map(employees.map((e) => [e.id, e]))

  return NextResponse.json({
    success: true,
    data: teams.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      member_count: t._count.members,
      members: t.members.map((m) => empMap.get(m.employeeId)).filter(Boolean),
    })),
  })
}

export async function POST(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!checkSuperAdminOnly(payload)) {
    return NextResponse.json({ success: false, message: "Hanya Super Admin yang dapat mengelola tim." }, { status: 403 })
  }
  try {
    const body = await request.json()
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: "Nama tim wajib diisi." }, { status: 400 })
    }
    const team = await prisma.team.create({
      data: { name: body.name.trim(), email: body.email?.trim() || null },
    })
    return NextResponse.json({
      success: true,
      message: `Tim '${team.name}' berhasil ditambahkan.`,
      data: { id: team.id, name: team.name, email: team.email },
    })
  } catch (error: any) {
    console.error("[Create Team Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat tim" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!checkSuperAdminOnly(payload)) {
    return NextResponse.json({ success: false, message: "Hanya Super Admin yang dapat mengelola tim." }, { status: 403 })
  }
  try {
    const body = await request.json()
    const id = parseInt(body.id, 10)
    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, message: "ID tim tidak valid." }, { status: 400 })
    }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: "Nama tim wajib diisi." }, { status: 400 })
    }
    const team = await prisma.team.update({
      where: { id },
      data: {
        name: body.name.trim(),
        email: body.email !== undefined ? (body.email?.trim() || null) : undefined,
      },
    })
    return NextResponse.json({
      success: true,
      message: `Tim '${team.name}' berhasil diperbarui.`,
      data: { id: team.id, name: team.name, email: team.email },
    })
  } catch (error: any) {
    console.error("[Update Team Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui tim" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!checkSuperAdminOnly(payload)) {
    return NextResponse.json({ success: false, message: "Hanya Super Admin yang dapat mengelola tim." }, { status: 403 })
  }
  const url = new URL(request.url)
  const idParam = url.searchParams.get("id")
  const id = idParam ? parseInt(idParam, 10) : null
  if (!id || isNaN(id)) {
    return NextResponse.json({ success: false, message: "ID tim tidak valid." }, { status: 400 })
  }

  try {
    const existing = await prisma.team.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: "Tim tidak ditemukan." }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Unlink tickets referencing this team
      await tx.ticket.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      })
      // Delete team members
      await tx.teamMember.deleteMany({
        where: { teamId: id },
      })
      // Delete team
      await tx.team.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      message: `Tim '${existing.name}' berhasil dihapus.`,
    })
  } catch (error: any) {
    console.error("[Delete Team Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus tim" },
      { status: 500 }
    )
  }
}
