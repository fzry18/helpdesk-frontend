import { NextRequest, NextResponse } from "next/server"
import { serverAxios } from "@/lib/serverAxios"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ODOO_BASE_URL = process.env.ODOO_BASE_URL || "https://erp1.gpedata.id"
const ODOO_API_KEY = process.env.ODOO_API_KEY || "Samarinda0123"

/**
 * POST /api/helpdesk/auth/change-password
 * Meneruskan permintaan ganti password ke Odoo Live:
 * POST /api/v1/auth/change-password
 * Sesuai Postman collection:
 * - Body (x-www-form-urlencoded): nik, old_password, new_password
 * - Header: X-API-Key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nik, old_password, new_password } = body

    if (!nik || !new_password) {
      return NextResponse.json(
        { success: false, message: "NIK dan Password Baru wajib diisi." },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password baru minimal 6 karakter." },
        { status: 400 }
      )
    }

    const formData = new URLSearchParams()
    formData.append("nik", String(nik).trim())
    formData.append("old_password", old_password ? String(old_password) : "")
    formData.append("new_password", String(new_password))

    const response = await serverAxios.post(
      `${ODOO_BASE_URL}/api/v1/auth/change-password`,
      formData.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-API-Key": ODOO_API_KEY,
        },
      }
    )

    return NextResponse.json(response.data, { status: response.status })
  } catch (error: any) {
    console.error("[Change Password Proxy Error]:", error.response?.status, error.response?.data || error.message)
    const status = error.response?.status || 500
    const message =
      error.response?.data?.message ||
      error.message ||
      "Gagal mengubah password pada server Odoo."
    return NextResponse.json({ success: false, message }, { status })
  }
}
