/**
 * GET /api/helpdesk/stages - List stages
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const stages = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: { sequence: "asc" },
  })

  return Response.json({
    success: true,
    data: stages.map((s) => ({
      id: s.id,
      name: s.name,
      sequence: s.sequence,
      is_starting: s.isStarting,
      is_closing: s.isClosing,
      fold: s.fold,
    })),
  })
}
