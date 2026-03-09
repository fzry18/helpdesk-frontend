/**
 * GET /api/helpdesk/priorities - List priorities
 */
import { NextRequest } from "next/server"
import { getAuthEmployee, authError } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  return Response.json({
    success: true,
    data: [
      { value: "0", label: "Very Low" },
      { value: "1", label: "Low" },
      { value: "2", label: "Normal" },
      { value: "3", label: "High" },
      { value: "4", label: "Very High" },
    ],
  })
}
