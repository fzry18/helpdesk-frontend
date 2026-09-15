import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"
import { saveFileToDisk } from "@/lib/storage"
import type { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/tickets - List tickets
 * USER → hanya tiket sendiri, ADMIN/IT_SUPPORT → semua
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "20")
  const search = url.searchParams.get("search") || ""
  const status = url.searchParams.get("status") || ""
  const queue = url.searchParams.get("queue") || ""
  const priority = url.searchParams.get("priority") || ""
  const stageId = url.searchParams.get("stage_id") || ""
  const teamId = url.searchParams.get("team_id") || ""
  const categoryId = url.searchParams.get("category_id") || ""
  const assignedTo = url.searchParams.get("assigned_to") || ""
  const myTickets = url.searchParams.get("my_tickets") === "true"
  const sort = url.searchParams.get("sort") || "createdAt"
  const order = (url.searchParams.get("order") || "desc") as "asc" | "desc"

  const canViewAll = payload.permissions.includes("ticket:view_all")
  const where: Prisma.TicketWhereInput = {}

  // RBAC: regular user can only see own tickets
  if (!canViewAll || myTickets) {
    where.createdById = payload.employeeId
  }

  // Queue tab filtering
  if (queue === "my_assigned") {
    where.assignedToId = payload.employeeId
    where.status = "open"
  } else if (queue === "unassigned") {
    where.assignedToId = null
    where.status = "open"
  } else if (queue === "waiting_confirmation") {
    where.waitingUserConfirmation = true
    where.status = "open"
  } else if (queue === "active") {
    where.status = "open"
  } else if (queue === "closed") {
    where.status = "closed"
  }

  // Generic status filter (if not already set by queue)
  if (!queue) {
    if (status === "open") {
      where.status = "open"
    } else if (status === "closed") {
      where.status = "closed"
    }
  }

  // Search filter
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ]
  }

  if (priority) where.priority = priority
  if (stageId) where.stageId = parseInt(stageId)
  if (teamId) where.teamId = parseInt(teamId)
  if (categoryId) where.categoryId = parseInt(categoryId)
  if (assignedTo) where.assignedToId = parseInt(assignedTo)

  try {
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          category: true,
          stage: true,
          team: true,
          createdBy: { select: { id: true, name: true, nik: true } },
          assignedTo: { select: { id: true, name: true } },
          attachments: { select: { id: true, filename: true, mimetype: true, fileSize: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { [sort === "create_date" ? "createdAt" : sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ])

    // Calculate queue counters for badge displays
    let counts: Record<string, number> = {}
    if (canViewAll) {
      const [myAssignedCount, unassignedCount, waitingCount, totalAllCount] = await Promise.all([
        prisma.ticket.count({
          where: { assignedToId: payload.employeeId, status: "open" },
        }),
        prisma.ticket.count({
          where: { assignedToId: null, status: "open" },
        }),
        prisma.ticket.count({
          where: { waitingUserConfirmation: true, status: "open" },
        }),
        prisma.ticket.count(),
      ])
      counts = {
        my_assigned: myAssignedCount,
        unassigned: unassignedCount,
        waiting_confirmation: waitingCount,
        all: totalAllCount,
      }
    } else {
      const [activeCount, closedCount] = await Promise.all([
        prisma.ticket.count({
          where: { createdById: payload.employeeId, status: "open" },
        }),
        prisma.ticket.count({
          where: { createdById: payload.employeeId, status: "closed" },
        }),
      ])
      counts = {
        active: activeCount,
        closed: closedCount,
      }
    }

    const totalPages = Math.ceil(total / limit)

    // Map to frontend expected format
    const mapped = tickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      subject: t.subject,
      description: t.description,
      priority: t.priority,
      status: t.status,
      waiting_user_confirmation: t.waitingUserConfirmation,
      resolution_confirmed: t.resolutionConfirmed,
      satisfaction_rating: t.satisfactionRating,
      feedback: t.feedback,
      stage: t.stage ? { id: t.stage.id, name: t.stage.name } : null,
      team: t.team ? { id: t.team.id, name: t.team.name } : null,
      category: t.category ? { id: t.category.id, name: t.category.name } : null,
      stage_id: t.stageId,
      stage_name: t.stage?.name || null,
      team_id: t.teamId,
      team_name: t.team?.name || null,
      category_id: t.categoryId,
      category_name: t.category?.name || null,
      created_by: t.createdBy
        ? { id: t.createdBy.id, name: t.createdBy.name, nik: t.createdBy.nik }
        : null,
      assigned_user: t.assignedTo
        ? { id: t.assignedTo.id, name: t.assignedTo.name }
        : null,
      assigned_user_id: t.assignedToId,
      assigned_user_name: t.assignedTo?.name || null,
      attachment_count: t.attachments.length,
      message_count: t._count.messages,
      create_date: t.createdAt.toISOString(),
      write_date: t.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: mapped,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
        counts,
      },
    })
  } catch (error) {
    console.error("[Tickets List] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/helpdesk/tickets - Create a new ticket
 */
export async function POST(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  if (!payload.permissions.includes("ticket:create")) {
    return NextResponse.json(
      { success: false, message: "Tidak memiliki izin untuk membuat tiket." },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      subject,
      description,
      priority,
      category_id,
      team_id,
      attachments = [],
    } = body

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, message: "Subject dan description harus diisi." },
        { status: 400 }
      )
    }

    // Generate ticket number: HD-YYYYMMDD-XXXX
    const today = new Date()
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0")

    const lastTicket = await prisma.ticket.findFirst({
      where: { ticketNumber: { startsWith: `HD-${dateStr}` } },
      orderBy: { ticketNumber: "desc" },
    })

    let seq = 1
    if (lastTicket) {
      const parts = lastTicket.ticketNumber.split("-")
      seq = parseInt(parts[2] || "0") + 1
    }
    const ticketNumber = `HD-${dateStr}-${seq.toString().padStart(4, "0")}`

    // Find starting stage
    const startingStage = await prisma.stage.findFirst({
      where: { isStarting: true },
      orderBy: { sequence: "asc" },
    })

    // Create ticket in database (team_id is optional; if not set, stays unassigned for Dispatcher)
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        subject,
        description,
        priority: priority || "1",
        status: "open",
        categoryId: category_id ? parseInt(category_id) : null,
        teamId: team_id ? parseInt(team_id) : null,
        stageId: startingStage?.id || null,
        createdById: payload.employeeId,
      },
      include: {
        category: true,
        stage: true,
        team: true,
        createdBy: { select: { id: true, name: true } },
      },
    })

    // Process file attachments if provided
    const savedAttachments = []
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.filename && att.file_data) {
          try {
            const saved = await saveFileToDisk(att.filename, att.file_data)
            const record = await prisma.attachment.create({
              data: {
                ticketId: ticket.id,
                filename: saved.filename,
                fileUrl: saved.relativeUrl,
                fileSize: saved.fileSize,
                mimetype: saved.mimetype,
              },
            })
            savedAttachments.push({
              id: record.id,
              name: record.filename,
              file_size: record.fileSize,
              mimetype: record.mimetype,
              url: `/api/helpdesk/attachments/${record.id}`,
            })
          } catch (fileErr) {
            console.error("[Attachment Save Error]:", fileErr)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        ticket_number: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        stage: ticket.stage ? { id: ticket.stage.id, name: ticket.stage.name } : null,
        team: ticket.team ? { id: ticket.team.id, name: ticket.team.name } : null,
        category: ticket.category
          ? { id: ticket.category.id, name: ticket.category.name }
          : null,
        created_by: ticket.createdBy
          ? { id: ticket.createdBy.id, name: ticket.createdBy.name }
          : null,
        attachments: savedAttachments,
        create_date: ticket.createdAt.toISOString(),
        write_date: ticket.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[Tickets Create] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
