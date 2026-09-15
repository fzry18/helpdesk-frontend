import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/tickets/[id]/thread
 * Alias for /messages - returns full message thread for a ticket
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

    const canViewAll = payload.permissions.includes("ticket:view_all")
    if (!canViewAll && ticket.createdById !== payload.employeeId) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      )
    }

    const isStaff = payload.permissions.includes("ticket:internal_note")

    const messages = await prisma.ticketMessage.findMany({
      where: {
        ticketId,
        ...(isStaff ? {} : { internal: false }),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
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
    }))

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error("[Thread] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
