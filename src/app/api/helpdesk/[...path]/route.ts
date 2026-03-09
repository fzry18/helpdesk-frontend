/**
 * Catch-all route - returns 404 for unimplemented API paths
 * All API routes are now handled by explicit Next.js route handlers
 */
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  return Response.json(
    { success: false, message: `API endpoint not found: ${path?.join("/")}`, data: null },
    { status: 404 }
  )
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  return Response.json(
    { success: false, message: `API endpoint not found: ${path?.join("/")}`, data: null },
    { status: 404 }
  )
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  return Response.json(
    { success: false, message: `API endpoint not found: ${path?.join("/")}`, data: null },
    { status: 404 }
  )
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  return Response.json(
    { success: false, message: `API endpoint not found: ${path?.join("/")}`, data: null },
    { status: 404 }
  )
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params
  return Response.json(
    { success: false, message: `API endpoint not found: ${path?.join("/")}`, data: null },
    { status: 404 }
  )
}
