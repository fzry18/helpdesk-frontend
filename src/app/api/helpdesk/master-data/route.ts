/**
 * GET /api/helpdesk/master-data - Get all master data
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError } from "@/lib/server/auth"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const [categories, stages, teams, tags] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sequence: "asc" },
    }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { sequence: "asc" },
    }),
    prisma.team.findMany({
      where: { isActive: true },
      include: {
        members: {
          include: { employee: true },
        },
      },
    }),
    prisma.tag.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ])

  const priorities = [
    { value: "0", label: "Very Low" },
    { value: "1", label: "Low" },
    { value: "2", label: "Normal" },
    { value: "3", label: "High" },
    { value: "4", label: "Very High" },
  ]

  return Response.json({
    success: true,
    data: {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sequence: c.sequence,
      })),
      types: [],  // Ticket types not needed currently, can be added later
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        member_count: t.members.length,
        members: t.members.map((m) => ({
          id: m.id,
          employee_id: m.employee.id,
          name: m.employee.name,
          nik: m.employee.nik,
          email: m.employee.email,
          phone: m.employee.phone,
          department_id: m.employee.departmentId,
          department_name: m.employee.department,
          job_title: m.employee.jobTitle,
        })),
      })),
      stages: stages.map((s) => ({
        id: s.id,
        name: s.name,
        sequence: s.sequence,
        is_starting: s.isStarting,
        is_closing: s.isClosing,
        fold: s.fold,
      })),
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
      priorities,
    },
  })
}
