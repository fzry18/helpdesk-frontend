import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/priorities - List priorities
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    data: [
      { value: "0", label: "Very Low" },
      { value: "1", label: "Low" },
      { value: "2", label: "Medium" },
      { value: "3", label: "High" },
      { value: "4", label: "Very High" },
    ],
  })
}
