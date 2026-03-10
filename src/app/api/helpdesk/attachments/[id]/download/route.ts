/**
 * GET /api/helpdesk/attachments/[id]/download - Download attachment from DB
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const attachmentId = parseInt(id, 10)

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: true },
  })

  if (!attachment) {
    return Response.json({ success: false, message: "Attachment tidak ditemukan", data: null }, { status: 404 })
  }

  if (!isAdmin(employee) && attachment.ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  if (!attachment.fileData) {
    return Response.json({ success: false, message: "File data tidak tersedia", data: null }, { status: 404 })
  }

  // Use inline for images (so preview works), attachment for other files
  const isImage = attachment.mimetype.startsWith("image/")
  const disposition = isImage
    ? `inline; filename="${attachment.name}"`
    : `attachment; filename="${attachment.name}"`

  return new Response(attachment.fileData, {
    headers: {
      "Content-Type": attachment.mimetype,
      "Content-Disposition": disposition,
      "Content-Length": String(attachment.fileSize),
      "Cache-Control": "private, max-age=3600",
    },
  })
}
