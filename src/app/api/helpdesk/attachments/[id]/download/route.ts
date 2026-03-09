/**
 * GET /api/helpdesk/attachments/[id]/download - Download attachment
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"
import { readFile } from "fs/promises"

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
