import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"
import { resolveDiskPath } from "@/lib/storage"
import { open } from "node:fs/promises"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/attachments/[id] - Stream attachment from disk securely
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check auth either via Authorization header or token query param (for <img> tags & direct downloads)
  const url = new URL(request.url)
  const tokenFromQuery = url.searchParams.get("token")
  const authHeader = request.headers.get("authorization") || (tokenFromQuery ? `Bearer ${tokenFromQuery}` : null)
  
  const payload = verifyRequest(authHeader)
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const attachmentId = parseInt(id)
  if (isNaN(attachmentId)) {
    return NextResponse.json({ success: false, message: "Invalid attachment ID" }, { status: 400 })
  }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: true,
        message: { include: { ticket: true } },
      },
    })

    if (!attachment) {
      return NextResponse.json({ success: false, message: "Attachment not found" }, { status: 404 })
    }

    const ticket = attachment.ticket || attachment.message?.ticket
    if (ticket) {
      const canViewAll = payload.permissions.includes("ticket:view_all")
      const isOwner = ticket.createdById === payload.employeeId
      const isAssignee = ticket.assignedToId === payload.employeeId

      if (!canViewAll && !isOwner && !isAssignee) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
      }
    }

    const diskPath = resolveDiskPath(attachment.fileUrl)
    
    // Open file and stream directly with readableWebStream() per Next.js App Router guidelines
    let file
    try {
      file = await open(diskPath)
    } catch {
      return NextResponse.json({ success: false, message: "File not found on disk" }, { status: 404 })
    }

    // Determine inline preview vs download (force download if ?download=1)
    const isDownloadRequested = url.searchParams.get("download") === "1"
    const isImageOrPdf =
      attachment.mimetype.startsWith("image/") || attachment.mimetype === "application/pdf"
    const disposition = !isDownloadRequested && isImageOrPdf ? "inline" : "attachment"

    return new Response(file.readableWebStream() as any, {
      headers: {
        "Content-Type": attachment.mimetype || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(attachment.filename)}"`,
        "Content-Length": String(attachment.fileSize),
        "Cache-Control": "private, max-age=86400",
      },
    })
  } catch (error) {
    console.error("[Attachment Stream] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
