/**
 * GET /api/helpdesk/tickets/[id]/attachments - Get ticket attachments
 * POST /api/helpdesk/tickets/[id]/attachments - Upload attachments (base64)
 */
import { NextRequest } from "next/server"
import { prisma } from "@/lib/server/prisma"
import { getAuthEmployee, authError, isAdmin } from "@/lib/server/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    return Response.json({ success: false, message: "Ticket tidak ditemukan", data: null }, { status: 404 })
  }
  if (!isAdmin(employee) && ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  const attachments = await prisma.attachment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({
    success: true,
    data: attachments.map((a) => ({
      id: a.id,
      name: a.name,
      filename: a.filename,
      mimetype: a.mimetype,
      file_size: a.fileSize,
      url: `/api/helpdesk/attachments/${a.id}/download`,
      create_date: a.createdAt.toISOString(),
    })),
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    return Response.json({ success: false, message: "Ticket tidak ditemukan", data: null }, { status: 404 })
  }
  if (!isAdmin(employee) && ticket.createdById !== employee.id) {
    return Response.json({ success: false, message: "Akses ditolak", data: null }, { status: 403 })
  }

  try {
    const body = await request.json()
    const files: Array<{ filename: string; file_data: string }> = body.files || []

    if (files.length === 0) {
      return Response.json({ success: false, message: "Tidak ada file untuk diupload", data: null }, { status: 400 })
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "uploads", "tickets", String(ticketId))
    await mkdir(uploadDir, { recursive: true })

    const createdAttachments = []

    for (const file of files) {
      // Decode base64
      const buffer = Buffer.from(file.file_data, "base64")
      const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_")
      const uniqueName = `${Date.now()}-${safeName}`
      const filePath = path.join(uploadDir, uniqueName)

      await writeFile(filePath, buffer)

      // Detect mimetype from extension
      const ext = path.extname(safeName).toLowerCase()
      const mimeMap: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".zip": "application/zip",
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          name: file.filename,
          filename: uniqueName,
          mimetype: mimeMap[ext] || "application/octet-stream",
          fileSize: buffer.length,
          filePath: filePath,
        },
      })

      createdAttachments.push({
        id: attachment.id,
        name: attachment.name,
        filename: attachment.filename,
        mimetype: attachment.mimetype,
        file_size: attachment.fileSize,
        url: `/api/helpdesk/attachments/${attachment.id}/download`,
        create_date: attachment.createdAt.toISOString(),
      })
    }

    return Response.json({
      success: true,
      data: createdAttachments,
    }, { status: 201 })
  } catch (error) {
    console.error("Upload attachment error:", error)
    return Response.json(
      { success: false, message: "Gagal mengupload file", data: null },
      { status: 500 }
    )
  }
}
