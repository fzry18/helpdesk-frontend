import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }
  const stages = await prisma.stage.findMany({ orderBy: { sequence: "asc" } })
  return NextResponse.json({
    success: true,
    data: stages.map((s) => ({
      id: s.id,
      name: s.name,
      sequence: s.sequence,
      is_starting: s.isStarting,
      is_closing: s.isClosing,
    })),
  })
}

export async function POST(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload || !payload.permissions.includes("master:manage")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const stage = await prisma.stage.create({
    data: {
      name: body.name,
      sequence: body.sequence || 10,
      isStarting: body.is_starting || false,
      isClosing: body.is_closing || false,
    },
  })
  return NextResponse.json({
    success: true,
    data: { id: stage.id, name: stage.name, is_starting: stage.isStarting, is_closing: stage.isClosing },
  })
}
