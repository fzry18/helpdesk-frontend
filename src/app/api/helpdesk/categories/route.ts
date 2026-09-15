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
  const categories = await prisma.category.findMany({ orderBy: { sequence: "asc" } })
  return NextResponse.json({
    success: true,
    data: categories.map((c) => ({ id: c.id, name: c.name, sequence: c.sequence })),
  })
}

export async function POST(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload || !payload.permissions.includes("master:manage")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }
  const body = await request.json()
  const category = await prisma.category.create({
    data: { name: body.name, sequence: body.sequence || 10 },
  })
  return NextResponse.json({ success: true, data: { id: category.id, name: category.name } })
}
