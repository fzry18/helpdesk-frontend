/**
 * GET /api/helpdesk/tags - List tags
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const tags = await prisma.tag.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  return Response.json({
    success: true,
    data: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    })),
  })
}
