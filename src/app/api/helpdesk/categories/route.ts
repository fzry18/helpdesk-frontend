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
  const categories = await prisma.category.findMany({ orderBy: { sequence: "asc" } })
  return NextResponse.json({
    success: true,
    data: categories.map((c) => ({ id: c.id, name: c.name, sequence: c.sequence })),
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
      return NextResponse.json({ success: false, message: "Nama kategori wajib diisi." }, { status: 400 })
    }
    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        sequence: body.sequence !== undefined ? parseInt(body.sequence, 10) : 10,
      },
    })
    return NextResponse.json({
      success: true,
      message: `Kategori '${category.name}' berhasil ditambahkan.`,
      data: { id: category.id, name: category.name, sequence: category.sequence },
    })
  } catch (error: any) {
    console.error("[Create Category Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal membuat kategori" },
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
      return NextResponse.json({ success: false, message: "ID kategori tidak valid." }, { status: 400 })
    }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, message: "Nama kategori wajib diisi." }, { status: 400 })
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name.trim(),
        sequence: body.sequence !== undefined ? parseInt(body.sequence, 10) : undefined,
      },
    })
    return NextResponse.json({
      success: true,
      message: `Kategori '${category.name}' berhasil diperbarui.`,
      data: { id: category.id, name: category.name, sequence: category.sequence },
    })
  } catch (error: any) {
    console.error("[Update Category Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui kategori" },
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
    return NextResponse.json({ success: false, message: "ID kategori tidak valid." }, { status: 400 })
  }

  try {
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: "Kategori tidak ditemukan." }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Unlink tickets referencing this category
      await tx.ticket.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      })
      await tx.category.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      message: `Kategori '${existing.name}' berhasil dihapus.`,
    })
  } catch (error: any) {
    console.error("[Delete Category Error]:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus kategori" },
      { status: 500 }
    )
  }
}
