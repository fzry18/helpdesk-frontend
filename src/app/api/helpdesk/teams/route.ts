import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }
  const teams = await prisma.team.findMany({
    include: {
      _count: { select: { members: true } },
      members: true,
    },
    orderBy: { name: "asc" },
  })

  // Fetch employee details for members
  const allEmployeeIds = Array.from(new Set(teams.flatMap((t) => t.members.map((m) => m.employeeId))))
  const employees = await prisma.employee.findMany({
    where: { id: { in: allEmployeeIds } },
    select: { id: true, nik: true, name: true, email: true, jobTitle: true, department: true },
  })
  const empMap = new Map(employees.map((e) => [e.id, e]))

  return NextResponse.json({
    success: true,
    data: teams.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      member_count: t._count.members,
      members: t.members.map((m) => empMap.get(m.employeeId)).filter(Boolean),
    })),
  })
}

export async function POST(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload || !payload.permissions.includes("master:manage")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const team = await prisma.team.create({
    data: { name: body.name, email: body.email || null },
  })
  return NextResponse.json({
    success: true,
    data: { id: team.id, name: team.name, email: team.email },
  })
}
