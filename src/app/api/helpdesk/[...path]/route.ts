import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.API_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BACKEND_URL ||
  "http://localhost:8072"

/**
 * Proxy semua request /api/helpdesk/* ke backend Odoo dengan meneruskan
 * header (termasuk Authorization) agar token auth tidak hilang.
 * Rewrite di next.config bisa tidak meneruskan header ke external URL.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "GET")
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "POST")
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "PUT")
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "PATCH")
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context, "DELETE")
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string
) {
  const { path } = await context.params
  const pathStr = path?.length ? path.join("/") : ""
  const search = request.nextUrl.searchParams.toString()
  const url = `${BACKEND_URL}/api/helpdesk/${pathStr}${search ? `?${search}` : ""}`

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === "host") return
    headers.set(key, value)
  })

  let body: string | undefined
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = await request.text()
    } catch {
      // no body
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    ...(body && body.length > 0 ? { body } : {}),
  })

  const responseHeaders = new Headers()
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return
    responseHeaders.set(key, value)
  })

  const responseBody = await res.text()
  return new NextResponse(responseBody, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  })
}
