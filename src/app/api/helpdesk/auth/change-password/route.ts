/**
 * POST /api/helpdesk/auth/change-password
 * Change password via Odoo API
 */
import { NextRequest } from "next/server"
import { getAuthEmployee, authError } from "@/lib/server/auth"
import { odooChangePassword } from "@/lib/server/odoo-client"

export async function POST(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) {
    return authError("Tidak terautentikasi", 401)
  }

  try {
    const body = await request.json()
    const { old_password, new_password } = body

    if (!old_password || !new_password) {
      return Response.json(
        { success: false, message: "Password lama dan baru harus diisi", data: null },
        { status: 400 }
      )
    }

    const result = await odooChangePassword(employee.nik, old_password, new_password)

    if (!result.success) {
      return Response.json(
        { success: false, message: result.message || "Gagal mengubah password", data: null },
        { status: 400 }
      )
    }

    return Response.json({
      success: true,
      message: "Password berhasil diubah",
      data: {
        nik: employee.nik,
        name: employee.name,
      },
    })
  } catch (error) {
    console.error("Change password error:", error)
    return Response.json(
      { success: false, message: "Terjadi kesalahan pada server", data: null },
      { status: 500 }
    )
  }
}
