import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"
import { getRealtimeBus } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/helpdesk/tickets/[id]/request-confirmation
 * Admin/IT Support meminta user konfirmasi bahwa masalah sudah teratasi.
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

  if (!payload.permissions.includes("ticket:request_confirm")) {
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

    const body = await request.json().catch(() => ({}))

    // Update ticket status
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        waitingUserConfirmation: true,
      },
    })

    // Post system message
    const msg = body.message || "Tim IT telah menyelesaikan perbaikan. Silakan konfirmasi apakah masalah sudah teratasi."
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: payload.employeeId,
        body: `[Permintaan Konfirmasi] ${msg}`,
        internal: false,
      },
    })

    // SSE notify
    const bus = getRealtimeBus()
    bus.publish(
      `ticket:${ticketId}`,
      JSON.stringify({
        type: "status_update",
        data: { waiting_user_confirmation: true },
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        waiting_user_confirmation: updated.waitingUserConfirmation,
      },
    })
  } catch (error) {
    console.error("[Request Confirmation] Error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
