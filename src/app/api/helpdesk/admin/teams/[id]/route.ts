/**
 * PATCH  /api/helpdesk/admin/teams/[id] - Update team
 * DELETE /api/helpdesk/admin/teams/[id] - Soft-delete team
 * Super Admin only.
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isSuperAdmin } from "@/lib/server/auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isSuperAdmin(employee)) {
    return Response.json(
      { success: false, message: "Hanya Super Admin yang dapat mengakses", data: null },
      { status: 403 }
    )
  }

  const { id } = await params
  const teamId = parseInt(id)
  if (isNaN(teamId)) {
    return Response.json(
      { success: false, message: "ID tim tidak valid", data: null },
      { status: 400 }
    )
  }

  const body = await request.json()
  const { name, description, is_active } = body

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return Response.json(
      { success: false, message: "Tim tidak ditemukan", data: null },
      { status: 404 }
    )
  }

  // Check name uniqueness if changing name
  if (name && name.trim() !== team.name) {
    const existing = await prisma.team.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return Response.json(
        { success: false, message: `Tim dengan nama "${name.trim()}" sudah ada`, data: null },
        { status: 409 }
      )
    }
  }

  try {
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (is_active !== undefined) updateData.isActive = !!is_active

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
    })

    return Response.json({
      success: true,
      message: `Tim "${updated.name}" berhasil diperbarui`,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        department_id: updated.departmentId,
        department_name: updated.departmentName,
        is_active: updated.isActive,
      },
    })
  } catch (error) {
    console.error("Update team error:", error)
    return Response.json(
      { success: false, message: "Gagal memperbarui tim", data: null },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")
  if (!isSuperAdmin(employee)) {
    return Response.json(
      { success: false, message: "Hanya Super Admin yang dapat mengakses", data: null },
      { status: 403 }
    )
  }

  const { id } = await params
  const teamId = parseInt(id)
  if (isNaN(teamId)) {
    return Response.json(
      { success: false, message: "ID tim tidak valid", data: null },
      { status: 400 }
    )
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    return Response.json(
      { success: false, message: "Tim tidak ditemukan", data: null },
      { status: 404 }
    )
  }

  try {
    // Soft delete
    await prisma.team.update({
      where: { id: teamId },
      data: { isActive: false },
    })

    return Response.json({
      success: true,
      message: `Tim "${team.name}" berhasil dinonaktifkan`,
    })
  } catch (error) {
    console.error("Delete team error:", error)
    return Response.json(
      { success: false, message: "Gagal menonaktifkan tim", data: null },
      { status: 500 }
    )
  }
}
