/**
 * POST /api/helpdesk/auth/logout - Logout and destroy session
 */
import { NextRequest } from "next/server"
import { deleteSession } from "@/lib/server/auth"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7)
      await deleteSession(token)
    }

    return Response.json({
      success: true,
      message: "Logout berhasil",
      data: null,
    })
  } catch (error) {
    console.error("Logout error:", error)
    return Response.json({
      success: true,
      message: "Logout berhasil",
      data: null,
    })
  }
}
