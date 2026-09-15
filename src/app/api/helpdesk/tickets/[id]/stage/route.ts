import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * PUT /api/helpdesk/tickets/[id]/stage - Update ticket stage
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  if (!payload.permissions.includes("ticket:update_stage")) {
    return NextResponse.json({ success: false, message: "Tidak memiliki izin." }, { status: 403 })
  }

  const { id } = await params
  const ticketId = parseInt(id)
  const body = await request.json()
  const { stage_id } = body

  try {
    const stage = await prisma.stage.findUnique({ where: { id: stage_id } })

    const updateData: Record<string, unknown> = { stageId: stage_id }
    if (stage?.isClosing) {
      updateData.status = "closed"
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        stage: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        stage: updated.stage ? { id: updated.stage.id, name: updated.stage.name } : null,
        status: updated.status,
      },
    })
  } catch (error) {
    console.error("[Update Stage] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
