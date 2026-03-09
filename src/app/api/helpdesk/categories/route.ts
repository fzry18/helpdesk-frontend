/**
 * GET /api/helpdesk/categories - List categories
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sequence: "asc" },
  })

  return Response.json({
    success: true,
    data: categories.map((c) => ({
      id: c.id,
      name: c.name,
      sequence: c.sequence,
    })),
  })
}
