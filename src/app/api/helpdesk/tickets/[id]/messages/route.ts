import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"
import { getRealtimeBus } from "@/lib/realtime"
import { saveFileToDisk } from "@/lib/storage"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/tickets/[id]/messages - List messages for a ticket
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
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Ticket tidak ditemukan." },
        { status: 404 }
      )
    }

    // RBAC check
    const canViewAll = payload.permissions.includes("ticket:view_all")
    if (!canViewAll && ticket.createdById !== payload.employeeId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      )
    }

    // Users should not see internal messages
    const isStaff = payload.permissions.includes("ticket:internal_note")

    const messages = await prisma.ticketMessage.findMany({
      where: {
        ticketId,
        ...(isStaff ? {} : { internal: false }),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        attachments: true,
      },
      orderBy: { createdAt: "asc" },
    })

    const mapped = messages.map((m) => ({
      id: m.id,
      body: m.body,
      body_plain: m.body.replace(/<[^>]+>/g, "").trim(),
      author: m.author
        ? { id: m.author.id, name: m.author.name, email: m.author.email }
        : null,
      date: m.createdAt.toISOString(),
      create_date: m.createdAt.toISOString(),
      is_internal: m.internal,
      attachments: m.attachments.map((a) => ({
        id: a.id,
        name: a.filename,
        filename: a.filename,
        mimetype: a.mimetype,
        file_size: a.fileSize,
        url: `/api/helpdesk/attachments/${a.id}`,
      })),
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error("[Messages List] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/helpdesk/tickets/[id]/messages - Send a message with optional attachments
 */
export async function POST(
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

    // Check if ticket is closed: if closed, no new messages allowed (user must create new ticket)
    if (ticket.status === "closed" || ticket.resolutionConfirmed) {
      return NextResponse.json(
        {
          success: false,
          message: "Tiket ini telah selesai. Silakan buat tiket baru jika mengalami kendala lain.",
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { body: messageBody, internal = false, attachments = [] } = body

    if ((!messageBody || messageBody.trim() === "") && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Pesan atau lampiran tidak boleh kosong." },
        { status: 400 }
      )
    }

    // Only staff can send internal notes
    if (internal && !payload.permissions.includes("ticket:internal_note")) {
      return NextResponse.json(
        { success: false, message: "Tidak memiliki izin untuk internal note." },
        { status: 403 }
      )
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: payload.employeeId,
        body: messageBody || "(Lampiran file)",
        internal,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    })

    // Process attachments
    const savedAttachments = []
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.filename && att.file_data) {
          try {
            const saved = await saveFileToDisk(att.filename, att.file_data)
            const record = await prisma.attachment.create({
              data: {
                ticketId,
                messageId: message.id,
                filename: saved.filename,
                fileUrl: saved.relativeUrl,
                fileSize: saved.fileSize,
                mimetype: saved.mimetype,
              },
            })
            savedAttachments.push({
              id: record.id,
              name: record.filename,
              filename: record.filename,
              file_size: record.fileSize,
              mimetype: record.mimetype,
              url: `/api/helpdesk/attachments/${record.id}`,
            })
          } catch (fileErr) {
            console.error("[Message Attachment Save Error]:", fileErr)
          }
        }
      }
    }

    // Update ticket updatedAt
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    })

    // Publish SSE event via realtime bus
    const bus = getRealtimeBus()
    const ssePayload = JSON.stringify({
      type: "new_message",
      data: {
        id: message.id,
        body: message.body,
        body_plain: message.body.replace(/<[^>]+>/g, "").trim(),
        author: message.author
          ? { id: message.author.id, name: message.author.name, email: message.author.email }
          : null,
        date: message.createdAt.toISOString(),
        create_date: message.createdAt.toISOString(),
        is_internal: message.internal,
        attachments: savedAttachments,
      },
    })
    bus.publish(`ticket:${ticketId}`, ssePayload)

    return NextResponse.json({
      success: true,
      data: {
        id: message.id,
        body: message.body,
        author: message.author,
        date: message.createdAt.toISOString(),
        is_internal: message.internal,
        attachments: savedAttachments,
      },
    })
  } catch (error) {
    console.error("[Messages Post] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
