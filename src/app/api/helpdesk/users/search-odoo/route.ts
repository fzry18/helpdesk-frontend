import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { serverAxios } from "@/lib/serverAxios"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ODOO_BASE_URL = process.env.ODOO_BASE_URL || "https://erp1.gpedata.id"
const ODOO_API_KEY = process.env.ODOO_API_KEY || "Samarinda0123"

/**
 * GET /api/helpdesk/users/search-odoo?q=...
 * Mencari data karyawan langsung dari Odoo Live
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get("q") || ""
  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [] })
  }

  try {
    const response = await serverAxios.get(
      `${ODOO_BASE_URL}/api/v1/search-employees?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "X-API-Key": ODOO_API_KEY,
        },
      }
    )

    const odooEmployees = response.data?.data || []
    return NextResponse.json({
      success: true,
      data: odooEmployees,
    })
  } catch (error: any) {
    console.error("[Search Odoo Employees] Error:", error?.message)
    return NextResponse.json({ success: false, message: "Gagal mencari data karyawan di Odoo." }, { status: 500 })
  }
}

/**
 * POST /api/helpdesk/users/search-odoo
 * Mengimpor/mendaftarkan karyawan dari Odoo ke Helpdesk dengan role awal
 */
export async function POST(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload || (!payload.roles.includes("SUPER_ADMIN") && !payload.isSuperAdmin)) {
    return NextResponse.json({ success: false, message: "Hanya Super Admin yang dapat menambahkan karyawan baru." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { employee_id, nik, name, operating_unit, role_slug = "IT_SUPPORT" } = body

    if (!employee_id || !nik || !name) {
      return NextResponse.json({ success: false, message: "Data karyawan tidak lengkap." }, { status: 400 })
    }

    const targetRole = await prisma.role.findUnique({
      where: { slug: role_slug },
    })

    if (!targetRole) {
      return NextResponse.json({ success: false, message: "Role tidak valid." }, { status: 400 })
    }

    const isSuper = role_slug === "SUPER_ADMIN"

    // Upsert employee
    const emp = await prisma.employee.upsert({
      where: { id: employee_id },
      update: {
        nik,
        name,
        operatingUnit: operating_unit || null,
        isSuperAdmin: isSuper,
      },
      create: {
        id: employee_id,
        nik,
        name,
        operatingUnit: operating_unit || null,
        isSuperAdmin: isSuper,
      },
    })

    // Assign role
    await prisma.userRole.deleteMany({ where: { employeeId: employee_id } })
    await prisma.userRole.create({
      data: {
        employeeId: employee_id,
        roleId: targetRole.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Karyawan ${name} (${nik}) berhasil ditambahkan dengan role ${targetRole.name}.`,
      data: emp,
    })
  } catch (error) {
    console.error("[Import Employee] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 })
  }
}
