import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"
import { getRealtimeBus } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/helpdesk/tickets/[id]/confirm-resolved
 * User mengkonfirmasi bahwa masalah sudah teratasi.
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

  if (!payload.permissions.includes("ticket:confirm_resolved")) {
    return NextResponse.json(
      { success: false, message: "Tidak memiliki izin." },
      { status: 403 }
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

    // Only the ticket creator can confirm
    if (ticket.createdById !== payload.employeeId) {
      return NextResponse.json(
        { success: false, message: "Hanya pembuat ticket yang bisa mengkonfirmasi." },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))

    // Find closing stage
    const closingStage = await prisma.stage.findFirst({
      where: { isClosing: true },
      orderBy: { sequence: "desc" },
    })

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        resolutionConfirmed: true,
        waitingUserConfirmation: false,
        status: "closed",
        satisfactionRating: body.satisfaction || null,
        feedback: body.feedback || null,
        stageId: closingStage?.id || ticket.stageId,
      },
    })

    // Post system message
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: payload.employeeId,
        body: `[Konfirmasi Selesai] Ticket telah dikonfirmasi selesai oleh ${payload.name}. Rating: ${body.satisfaction || "-"}`,
        internal: false,
      },
    })

    // SSE notify
    const bus = getRealtimeBus()
    bus.publish(
      `ticket:${ticketId}`,
      JSON.stringify({
        type: "status_update",
        data: {
          resolution_confirmed: true,
          status: "closed",
        },
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        resolution_confirmed: updated.resolutionConfirmed,
        status: updated.status,
      },
    })
  } catch (error) {
    console.error("[Confirm Resolved] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
