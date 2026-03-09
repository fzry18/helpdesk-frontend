/**
 * POST /api/helpdesk/auth/force-change-password
 * Change default password (no auth required).
 * Used when Odoo returns PASSWORD_CHANGE_REQUIRED on first login.
 */
import { NextRequest } from "next/server"
import { odooChangePassword } from "@/lib/server/odoo-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nik, old_password, new_password } = body

    if (!nik || !old_password || !new_password) {
      return Response.json(
        { success: false, message: "NIK, password lama, dan password baru harus diisi", data: null },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return Response.json(
        { success: false, message: "Password baru minimal 6 karakter", data: null },
        { status: 400 }
      )
    }

    const result = await odooChangePassword(nik, old_password, new_password)

    if (!result.success) {
      return Response.json(
        { success: false, message: result.message || "Gagal mengubah password", data: null },
        { status: 400 }
      )
    }

    return Response.json({
      success: true,
      message: "Password berhasil diubah. Silakan login dengan password baru.",
      data: { nik },
    })
  } catch (error) {
    console.error("Force change password error:", error)
    return Response.json(
      { success: false, message: "Terjadi kesalahan pada server", data: null },
      { status: 500 }
    )
  }
}
