import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function checkPermission(payload: any) {
  return (
    payload &&
    (payload.isSuperAdmin ||
      payload.roles?.includes("SUPER_ADMIN") ||
      payload.roles?.includes("ADMIN_IT_SUPPORT") ||
      payload.permissions?.includes("master:manage"))
  )
}

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
  if (!checkPermission(payload)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }
  try {
    const body = await request.json()
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: "Nama tahapan wajib diisi." }, { status: 400 })
    }

    const isStarting = Boolean(body.is_starting)
    const isClosing = Boolean(body.is_closing)

    const stage = await prisma.$transaction(async (tx) => {
      if (isStarting) {
        await tx.stage.updateMany({
          data: { isStarting: false },
        })
      }
      return tx.stage.create({
        data: {
          name: body.name.trim(),
          sequence: body.sequence !== undefined ? parseInt(body.sequence, 10) : 10,
          isStarting,
          isClosing,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Tahapan '${stage.name}' berhasil ditambahkan.`,
      data: {
        id: stage.id,
        name: stage.name,
        sequence: stage.sequence,
        is_starting: stage.isStarting,
        is_closing: stage.isClosing,
      },
    })
  } catch (error: any) {
    console.error("[Create Stage Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat tahapan" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!checkPermission(payload)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }
  try {
    const body = await request.json()
    const id = parseInt(body.id, 10)
    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, message: "ID tahapan tidak valid." }, { status: 400 })
    }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: "Nama tahapan wajib diisi." }, { status: 400 })
    }

    const stage = await prisma.$transaction(async (tx) => {
      if (body.is_starting) {
        await tx.stage.updateMany({
          where: { id: { not: id } },
          data: { isStarting: false },
        })
      }

      return tx.stage.update({
        where: { id },
        data: {
          name: body.name.trim(),
          sequence: body.sequence !== undefined ? parseInt(body.sequence, 10) : undefined,
          isStarting: body.is_starting !== undefined ? Boolean(body.is_starting) : undefined,
          isClosing: body.is_closing !== undefined ? Boolean(body.is_closing) : undefined,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Tahapan '${stage.name}' berhasil diperbarui.`,
      data: {
        id: stage.id,
        name: stage.name,
        sequence: stage.sequence,
        is_starting: stage.isStarting,
        is_closing: stage.isClosing,
      },
    })
  } catch (error: any) {
    console.error("[Update Stage Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui tahapan" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!checkPermission(payload)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
  }
  const url = new URL(request.url)
  const idParam = url.searchParams.get("id")
  const id = idParam ? parseInt(idParam, 10) : null
  if (!id || isNaN(id)) {
    return NextResponse.json({ success: false, message: "ID tahapan tidak valid." }, { status: 400 })
  }

  try {
    const count = await prisma.stage.count()
    if (count <= 1) {
      return NextResponse.json(
        { success: false, message: "Tidak dapat menghapus satu-satunya tahapan tiket dalam sistem." },
        { status: 400 }
      )
    }

    const existing = await prisma.stage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: "Tahapan tidak ditemukan." }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Reassign tickets currently on this stage to a fallback stage
      const fallback = await tx.stage.findFirst({
        where: { id: { not: id }, isStarting: true },
      }) || (await tx.stage.findFirst({ where: { id: { not: id } } }))

      if (fallback) {
        await tx.ticket.updateMany({
          where: { stageId: id },
          data: { stageId: fallback.id },
        })
      } else {
        await tx.ticket.updateMany({
          where: { stageId: id },
          data: { stageId: null },
        })
      }

      await tx.stage.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      message: `Tahapan '${existing.name}' berhasil dihapus.`,
    })
  } catch (error: any) {
    console.error("[Delete Stage Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus tahapan" },
      { status: 500 }
    )
  }
}
