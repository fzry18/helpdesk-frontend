import { NextRequest, NextResponse } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/admin/audit-logs
 * Menampilkan riwayat aktivitas login karyawan
 */
export async function GET(request: NextRequest) {
  const payload = verifyRequest(request.headers.get("authorization"))
  if (!payload) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  // Only Admin IT Support or Super Admin
  const isSuperAdmin = payload.isSuperAdmin || payload.roles.includes("SUPER_ADMIN")
  const isAdminIT = payload.roles.includes("ADMIN_IT_SUPPORT")
  if (!isSuperAdmin && !isAdminIT) {
    return NextResponse.json({ success: false, message: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "25")
  const search = url.searchParams.get("search") || ""

  const where: Prisma.LoginLogWhereInput = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nik: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
    ]
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.loginLog.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        employee_id: log.employeeId,
        nik: log.nik,
        name: log.name,
        ip_address: log.ipAddress || "-",
        user_agent: log.userAgent || "-",
        created_at: log.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    })
  } catch (error) {
    console.error("[Audit Logs Error]:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
