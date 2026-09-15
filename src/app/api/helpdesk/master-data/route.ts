import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/master-data - Get all master data (categories, stages, teams, priorities)
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const [categories, stages, rawTeams] = await Promise.all([
      prisma.category.findMany({ orderBy: { sequence: "asc" } }),
      prisma.stage.findMany({ orderBy: { sequence: "asc" } }),
      prisma.team.findMany({
        include: {
          _count: { select: { members: true } },
          members: true,
        },
        orderBy: { name: "asc" },
      }),
    ])

    const allMemberIds = Array.from(new Set(rawTeams.flatMap((t) => t.members.map((m) => m.employeeId))))
    const memberEmps = await prisma.employee.findMany({
      where: { id: { in: allMemberIds } },
      select: { id: true, nik: true, name: true, email: true, jobTitle: true, department: true },
    })
    const empMap = new Map(memberEmps.map((e) => [e.id, e]))

    const teams = rawTeams.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      member_count: t._count.members,
      members: t.members.map((m) => empMap.get(m.employeeId)).filter(Boolean),
    }))

    const priorities = [
      { value: "0", label: "Very Low" },
      { value: "1", label: "Low" },
      { value: "2", label: "Medium" },
      { value: "3", label: "High" },
      { value: "4", label: "Very High" },
    ]

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          sequence: c.sequence,
        })),
        stages: stages.map((s) => ({
          id: s.id,
          name: s.name,
          sequence: s.sequence,
          is_starting: s.isStarting,
          is_closing: s.isClosing,
        })),
        teams,
        priorities,
        types: [],
        tags: [],
      },
    })
  } catch (error) {
    console.error("[Master Data] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
