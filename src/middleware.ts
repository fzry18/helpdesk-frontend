import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/helpdesk/auth/login",
  "/api/helpdesk/auth/force-change-password",
]

const STATIC_PATH_PREFIXES = ["/_next", "/favicon.ico"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isStaticPath(pathname: string): boolean {
  return STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isStaticPath(pathname) || isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const cookieToken = request.cookies.get("access_token")?.value
  const authHeader = request.headers.get("authorization")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null
  const token = cookieToken || bearerToken

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null },
        { status: 401 }
      )
    }

    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set("x-access-token", token)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
