/**
 * GET /api/helpdesk/tickets - List tickets with pagination
 * POST /api/helpdesk/tickets - Create a new ticket
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin, isSuperAdmin } from "@/lib/server/auth"
import {
  generateTicketNumber,
  parsePriority,
  formatTicketResponse,
  TICKET_INCLUDES,
  mapStatusFilter,
} from "./helpers"
import type { Prisma } from "@/generated/prisma"

export async function GET(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
  const skip = (page - 1) * limit
  const search = searchParams.get("search") || undefined
  const status = searchParams.get("status") || undefined
  const priority = searchParams.get("priority") || undefined
  const teamId = searchParams.get("team_id") ? parseInt(searchParams.get("team_id")!) : undefined
  const categoryId = searchParams.get("category_id") ? parseInt(searchParams.get("category_id")!) : undefined
  const stageId = searchParams.get("stage_id") ? parseInt(searchParams.get("stage_id")!) : undefined
  const myTickets = searchParams.get("my_tickets") === "true"
  const ticketCategoryType = searchParams.get("ticket_category_type") as "system" | "helper" | undefined
  const sort = searchParams.get("sort") || "created_at"
  const order = (searchParams.get("order") || "desc") as "asc" | "desc"

  // Build where clause
  const where: Prisma.TicketWhereInput = {}

  // Visibility rules:
  // - User: only own tickets
  // - Dept Admin: own dept tickets + own tickets
  // - Super Admin: all tickets
  if (!isAdmin(employee)) {
    where.createdById = employee.id
  } else if (!isSuperAdmin(employee)) {
    // Dept Admin: see tickets from their department + their own
    if (myTickets) {
      where.OR = [
        { createdById: employee.id },
        { assignedToId: employee.id },
      ]
    } else if (employee.departmentId) {
      where.OR = [
        { createdById: employee.id },
        { departmentId: employee.departmentId },
      ]
    }
  } else if (myTickets) {
    // Super Admin with my_tickets filter
    where.OR = [
      { createdById: employee.id },
      { assignedToId: employee.id },
    ]
  }

  // Status filter
  const statusValues = mapStatusFilter(status)
  if (statusValues) {
    where.status = { in: statusValues }
  }

  // Priority filter
  if (priority) {
    where.priority = parsePriority(priority)
  }

  // Team filter
  if (teamId) where.teamId = teamId
  if (categoryId) where.categoryId = categoryId
  if (stageId) where.stageId = stageId

  // Category type filter
  if (ticketCategoryType) {
    where.ticketCategoryType = ticketCategoryType.toUpperCase() as "HELPER" | "SYSTEM"
  }

  // Search filter
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  // Sort mapping
  const sortMap: Record<string, string> = {
    created_at: "createdAt",
    updated_at: "updatedAt",
    priority: "priority",
    status: "status",
    ticket_number: "ticketNumber",
  }
  const orderByField = sortMap[sort] || "createdAt"

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: TICKET_INCLUDES,
      skip,
      take: limit,
      orderBy: { [orderByField]: order },
    }),
    prisma.ticket.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return Response.json({
    success: true,
    data: tickets.map(formatTicketResponse),
    meta: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  })
}

export async function POST(request: NextRequest) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  try {
    const body = await request.json()

    const {
      subject,
      description,
      priority,
      category_id,
      team_id,
      ticket_category_type,
      system_category,
      tag_ids,
    } = body

    if (!subject || !description) {
      return Response.json(
        { success: false, message: "Subject dan deskripsi harus diisi", data: null },
        { status: 400 }
      )
    }

    const ticketNumber = await generateTicketNumber()

    // Find the starting stage
    let defaultStage = await prisma.stage.findFirst({
      where: { isStarting: true, isActive: true },
      orderBy: { sequence: "asc" },
    })
    if (!defaultStage) {
      defaultStage = await prisma.stage.findFirst({
        where: { isActive: true },
        orderBy: { sequence: "asc" },
      })
    }

    const ticketData: Prisma.TicketCreateInput = {
      ticketNumber,
      subject,
      description,
      priority: parsePriority(priority),
      status: "OPEN",
      ticketCategoryType: ticket_category_type?.toUpperCase() as "HELPER" | "SYSTEM" | undefined,
      systemCategory: system_category || null,
      departmentId: employee.departmentId,
      departmentName: employee.department,
      createdBy: { connect: { id: employee.id } },
      ...(defaultStage ? { stage: { connect: { id: defaultStage.id } } } : {}),
      ...(category_id ? { category: { connect: { id: category_id } } } : {}),
      ...(team_id ? { team: { connect: { id: team_id } } } : {}),
    }

    const ticket = await prisma.ticket.create({
      data: ticketData,
      include: TICKET_INCLUDES,
    })

    // Connect tags
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      await prisma.ticketTag.createMany({
        data: tag_ids.map((tagId: number) => ({
          ticketId: ticket.id,
          tagId,
        })),
        skipDuplicates: true,
      })
    }

    // Reload with tags
    const fullTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: TICKET_INCLUDES,
    })

    // Activity log
    await prisma.activityLog.create({
      data: {
        ticketId: ticket.id,
        employeeId: employee.id,
        activityType: "created",
        content: `Ticket ${ticketNumber} dibuat oleh ${employee.name}`,
      },
    })

    return Response.json({
      success: true,
      data: formatTicketResponse(fullTicket!),
    }, { status: 201 })
  } catch (error) {
    console.error("Create ticket error:", error)
    return Response.json(
      { success: false, message: "Gagal membuat ticket", data: null },
      { status: 500 }
    )
  }
}
