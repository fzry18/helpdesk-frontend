import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/tickets/[id] - Get ticket detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id } = await params
  const ticketId = parseInt(id)

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        stage: true,
        team: true,
        createdBy: { select: { id: true, name: true, nik: true, email: true, phone: true } },
        assignedTo: { select: { id: true, name: true } },
        attachments: { where: { messageId: null } },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket tidak ditemukan." },
        { status: 404 }
      )
    }

    // RBAC: user can only see own tickets
    const canViewAll = payload.permissions.includes("ticket:view_all")
    if (!canViewAll && ticket.createdById !== payload.employeeId) {
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke ticket ini." },
        { status: 403 }
      )
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
        waiting_user_confirmation: ticket.waitingUserConfirmation,
        resolution_confirmed: ticket.resolutionConfirmed,
        satisfaction_rating: ticket.satisfactionRating,
        feedback: ticket.feedback,
        stage: ticket.stage ? { id: ticket.stage.id, name: ticket.stage.name } : null,
        team: ticket.team ? { id: ticket.team.id, name: ticket.team.name } : null,
        category: ticket.category ? { id: ticket.category.id, name: ticket.category.name } : null,
        stage_id: ticket.stageId,
        stage_name: ticket.stage?.name || null,
        team_id: ticket.teamId,
        team_name: ticket.team?.name || null,
        category_id: ticket.categoryId,
        category_name: ticket.category?.name || null,
        created_by: ticket.createdBy
          ? { id: ticket.createdBy.id, name: ticket.createdBy.name }
          : null,
        customer: ticket.createdBy
          ? {
              id: ticket.createdBy.id,
              name: ticket.createdBy.name,
              email: ticket.createdBy.email || "",
              phone: ticket.createdBy.phone || "",
            }
          : null,
        assigned_user: ticket.assignedTo
          ? { id: ticket.assignedTo.id, name: ticket.assignedTo.name }
          : null,
        assigned_user_id: ticket.assignedToId,
        assigned_user_name: ticket.assignedTo?.name || null,
        attachments: ticket.attachments.map((a) => ({
          id: a.id,
          name: a.filename,
          filename: a.filename,
          mimetype: a.mimetype,
          file_size: a.fileSize,
          url: `/api/helpdesk/attachments/${a.id}`,
        })),
        create_date: ticket.createdAt.toISOString(),
        write_date: ticket.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[Ticket Detail] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/helpdesk/tickets/[id] - Update ticket
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  }

  const { id } = await params
  const ticketId = parseInt(id)

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket tidak ditemukan." },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    // Fields that admins can update
    if (payload.permissions.includes("ticket:assign") && body.assigned_to_id !== undefined) {
      updateData.assignedToId = body.assigned_to_id
    }
    if (payload.permissions.includes("ticket:update_stage") && body.stage_id !== undefined) {
      updateData.stageId = body.stage_id
      // Check if closing stage
      if (body.stage_id) {
        const stage = await prisma.stage.findUnique({ where: { id: body.stage_id } })
        if (stage?.isClosing) {
          updateData.status = "closed"
        }
      }
    }
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.team_id !== undefined) updateData.teamId = body.team_id
    if (body.category_id !== undefined) updateData.categoryId = body.category_id

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        category: true,
        stage: true,
        team: true,
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        ticket_number: updated.ticketNumber,
        subject: updated.subject,
        status: updated.status,
        priority: updated.priority,
        stage: updated.stage ? { id: updated.stage.id, name: updated.stage.name } : null,
        team: updated.team ? { id: updated.team.id, name: updated.team.name } : null,
        category: updated.category ? { id: updated.category.id, name: updated.category.name } : null,
        assigned_user: updated.assignedTo
          ? { id: updated.assignedTo.id, name: updated.assignedTo.name }
          : null,
        create_date: updated.createdAt.toISOString(),
        write_date: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[Ticket Update] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
