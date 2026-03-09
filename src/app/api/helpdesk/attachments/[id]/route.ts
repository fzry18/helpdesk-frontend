/**
 * GET /api/helpdesk/attachments/[id]/download - Download attachment file
 * DELETE /api/helpdesk/attachments/[id] - Delete attachment
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"
import { readFile, unlink } from "fs/promises"

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

  try {
    const fileBuffer = await readFile(attachment.filePath)
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": attachment.mimetype,
        "Content-Disposition": `attachment; filename="${attachment.name}"`,
        "Content-Length": String(attachment.fileSize),
      },
    })
  } catch {
    return Response.json({ success: false, message: "File tidak ditemukan di server", data: null }, { status: 404 })
  }
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

  // Delete file from disk
  try {
    await unlink(attachment.filePath)
  } catch {
    // File may already be deleted
  }

  await prisma.attachment.delete({ where: { id: attachmentId } })

  return Response.json({ success: true, message: "Attachment berhasil dihapus", data: null })
}
