/**
 * POST   /api/helpdesk/admin/teams/[id]/members - Add member to team
 * DELETE /api/helpdesk/admin/teams/[id]/members - Remove member from team
 * Super Admin only.
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isSuperAdmin, getSessionOdooToken } from "@/lib/server/auth"
import { odooFindEmployeeByNik, parseOdooEmployeeName } from "@/lib/server/odoo-client"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

  const body = await request.json()
  const { nik } = body

  if (!nik) {
    return Response.json(
      { success: false, message: "NIK harus diisi", data: null },
      { status: 400 }
    )
  }

  try {
    // Find or create employee from Odoo
    let targetEmployee = await prisma.employee.findUnique({ where: { nik } })

    if (!targetEmployee) {
      // Fetch from Odoo and create locally
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
        },
      })
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_employeeId: { teamId, employeeId: targetEmployee.id } },
    })
    if (existingMember) {
      return Response.json(
        { success: false, message: `${targetEmployee.name} sudah menjadi anggota tim ini`, data: null },
        { status: 409 }
      )
    }

    const member = await prisma.teamMember.create({
      data: { teamId, employeeId: targetEmployee.id },
      include: { employee: true },
    })

    return Response.json({
      success: true,
      message: `${targetEmployee.name} berhasil ditambahkan ke tim "${team.name}"`,
      data: {
        id: member.id,
        employee_id: member.employee.id,
        name: member.employee.name,
        nik: member.employee.nik,
        email: member.employee.email,
        phone: member.employee.phone,
        department: member.employee.department,
        department_id: member.employee.departmentId,
        job_title: member.employee.jobTitle,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Add team member error:", error)
    return Response.json(
      { success: false, message: "Gagal menambahkan anggota tim", data: null },
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

  const body = await request.json()
  const { member_id } = body

  if (!member_id) {
    return Response.json(
      { success: false, message: "member_id harus diisi", data: null },
      { status: 400 }
    )
  }

  try {
    const member = await prisma.teamMember.findFirst({
      where: { id: member_id, teamId },
      include: { employee: true },
    })

    if (!member) {
      return Response.json(
        { success: false, message: "Anggota tim tidak ditemukan", data: null },
        { status: 404 }
      )
    }

    await prisma.teamMember.delete({ where: { id: member_id } })

    return Response.json({
      success: true,
      message: `${member.employee.name} berhasil dihapus dari tim`,
    })
  } catch (error) {
    console.error("Remove team member error:", error)
    return Response.json(
      { success: false, message: "Gagal menghapus anggota tim", data: null },
      { status: 500 }
    )
  }
}
