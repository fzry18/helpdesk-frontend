import { NextRequest, NextResponse } from "next/server"
import { verifyRequest, getOdooSession } from "@/lib/serverAuth"
import { serverAxios } from "@/lib/serverAxios"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ODOO_BASE_URL = process.env.ODOO_BASE_URL || "https://erp1.gpedata.id"
const ODOO_API_KEY = process.env.ODOO_API_KEY || "Samarinda0123"

/**
 * Helper to normalize Odoo employee record into standard format.
 */
function mapOdooEmployee(emp: any) {
  const nik = emp.nik || emp.identification_id || emp.barcode || ""

  let department = ""
  if (typeof emp.department_id === "string") {
    department = emp.department_id
  } else if (Array.isArray(emp.department_id) && emp.department_id.length > 1) {
    department = emp.department_id[1]
  } else if (emp.department && typeof emp.department === "string") {
    department = emp.department
  } else if (emp.department_name) {
    department = emp.department_name
  }

  let jobTitle = ""
  if (typeof emp.job_id === "string") {
    jobTitle = emp.job_id
  } else if (Array.isArray(emp.job_id) && emp.job_id.length > 1) {
    jobTitle = emp.job_id[1]
  } else if (emp.job_title && typeof emp.job_title === "string") {
    jobTitle = emp.job_title
  } else if (emp.job_name) {
    jobTitle = emp.job_name
  }

  let operatingUnit = ""
  if (typeof emp.operating_unit_id === "string") {
    operatingUnit = emp.operating_unit_id
  } else if (Array.isArray(emp.operating_unit_id) && emp.operating_unit_id.length > 1) {
    operatingUnit = emp.operating_unit_id[1]
  } else if (emp.operating_unit) {
    operatingUnit = typeof emp.operating_unit === "string" ? emp.operating_unit : String(emp.operating_unit)
  }

  return {
    id: emp.id,
    nik: String(nik || emp.id),
    name: emp.name || "",
    operating_unit: operatingUnit || "-",
    department: department || "-",
    job_title: jobTitle || "-",
  }
}

/**
 * GET /api/helpdesk/users/search-odoo?q=...
 * Mencari data karyawan langsung dari Odoo Live
 * Menggunakan endpoint /api/v1/employee?f_name=... sesuai Postman Collection
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

  // Retrieve Odoo Bearer token from JWT payload or server session cache
  const odooToken = payload.odooToken || getOdooSession(payload.employeeId)
  if (!odooToken) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sesi token Odoo belum tersinkronisasi. Silakan logout dan login ulang ke akun Anda untuk mengaktifkan pencarian karyawan Odoo Live.",
      },
      { status: 401 }
    )
  }

  try {
    const headers = {
      Authorization: `Bearer ${odooToken}`,
    }

    const rawList: any[] = []

    // 1. Query /api/v1/employee?f_name=... sesuai dokumentasi Postman
    try {
      const resName = await serverAxios.get(
        `${ODOO_BASE_URL}/api/v1/employee?f_name=${encodeURIComponent(q)}`,
        { headers }
      )
      const data = resName.data?.data
      if (Array.isArray(data)) {
        rawList.push(...data)
      } else if (data && typeof data === "object") {
        rawList.push(data)
      }
    } catch (nameErr: any) {
      console.warn("[Search Odoo] /api/v1/employee?f_name error:", nameErr.response?.status, nameErr.response?.data || nameErr.message)
    }

    // 2. Query /api/v1/employee?f_nik=... jika q mengandung angka/titik atau jika nama belum menghasilkan
    const hasDigits = /\d/.test(q)
    if (hasDigits || rawList.length === 0) {
      try {
        const resNik = await serverAxios.get(
          `${ODOO_BASE_URL}/api/v1/employee?f_nik=${encodeURIComponent(q)}`,
          { headers }
        )
        const data = resNik.data?.data
        if (Array.isArray(data)) {
          rawList.push(...data)
        } else if (data && typeof data === "object") {
          rawList.push(data)
        }
      } catch (nikErr: any) {
        // Silently ignore
      }
    }

    // Deduplicate by employee id
    const seenIds = new Set<number>()
    const odooEmployees = []
    for (const item of rawList) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id)
        odooEmployees.push(mapOdooEmployee(item))
      }
    }

    return NextResponse.json({
      success: true,
      data: odooEmployees,
    })
  } catch (error: any) {
    const status = error.response?.status || 500
    const message =
      error.response?.data?.message ||
      error.message ||
      "Gagal mencari data karyawan di Odoo Live."
    console.error("[Search Odoo Employees] Error:", { status, message })
    return NextResponse.json({ success: false, message }, { status })
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
    const {
      employee_id,
      nik,
      name,
      operating_unit,
      department,
      job_title,
      role_slug = "IT_SUPPORT",
    } = body

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
        department: department || undefined,
        jobTitle: job_title || undefined,
        isSuperAdmin: isSuper,
      },
      create: {
        id: employee_id,
        nik,
        name,
        operatingUnit: operating_unit || null,
        department: department || null,
        jobTitle: job_title || null,
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
