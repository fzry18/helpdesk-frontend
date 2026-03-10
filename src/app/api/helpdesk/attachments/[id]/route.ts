/**
 * GET /api/helpdesk/attachments/[id] - Serve attachment (inline for images)
 * DELETE /api/helpdesk/attachments/[id] - Delete attachment
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

  // Verify access
  if (!isAdmin(employee) && attachment.ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  if (!attachment.fileData) {
    return Response.json({ success: false, message: "File data tidak tersedia", data: null }, { status: 404 })
  }

  // Use inline disposition for images so they display in browser
  const isImage = attachment.mimetype.startsWith("image/")
  const disposition = isImage ? "inline" : `attachment; filename="${attachment.name}"`

  return new Response(attachment.fileData, {
    headers: {
      "Content-Type": attachment.mimetype,
      "Content-Disposition": disposition,
      "Content-Length": String(attachment.fileSize),
      "Cache-Control": "private, max-age=3600",
    },
  })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

  await prisma.attachment.delete({ where: { id: attachmentId } })

  return Response.json({ success: true, message: "Attachment berhasil dihapus", data: null })
}
