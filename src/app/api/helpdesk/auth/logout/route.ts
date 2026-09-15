import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  // JWT-based auth is stateless, so logout is handled client-side.
  // This endpoint exists for API consistency and potential future server-side token blocklisting.
  return NextResponse.json({
    success: true,
    message: "Berhasil logout.",
  })
}
