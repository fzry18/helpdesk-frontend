import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * PUT /api/helpdesk/tickets/[id]/assign - Assign ticket to user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  if (!payload.permissions.includes("ticket:assign")) {
    return NextResponse.json({ success: false, message: "Tidak memiliki izin assign." }, { status: 403 })
  }

  const { id } = await params
  const ticketId = parseInt(id)
  const body = await request.json()

  try {
    let assignedToId: number | null = null

    if (body.assign_to_me) {
      assignedToId = payload.employeeId
    } else if (body.user_id) {
      assignedToId = body.user_id
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        assigned_user: updated.assignedTo
          ? { id: updated.assignedTo.id, name: updated.assignedTo.name }
          : null,
      },
    })
  } catch (error) {
    console.error("[Assign Ticket] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
