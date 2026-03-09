/**
 * Auth utilities for JWT session management
 */
import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"
import { prisma } from "./prisma"
import type { Employee, HelpdeskRole } from "@/generated/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "helpdesk-secret-key-change-in-production"

export interface JWTPayload {
  employeeId: number
  nik: string
  name: string
  role: HelpdeskRole
  sessionId: string
}

/**
 * Create a JWT token for the employee
 */
export function createToken(payload: JWTPayload, expiresIn: string = "24h"): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Create a session for the employee in the database
 */
export async function createSession(
  employeeId: number,
  odooToken?: string
): Promise<{ token: string; expiresAt: Date }> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  })

  if (!employee) {
    throw new Error("Employee not found")
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const sessionId = crypto.randomUUID()

  const token = createToken({
    employeeId: employee.id,
    nik: employee.nik,
    name: employee.name,
    role: employee.helpdeskRole,
    sessionId,
  })

  await prisma.session.create({
    data: {
      id: sessionId,
      employeeId,
      token,
      odooToken,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * Get the authenticated employee from a request
 * Returns null if not authenticated
 */
export async function getAuthEmployee(
  request: NextRequest
): Promise<Employee | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  // Verify session exists and is not expired
  const session = await prisma.session.findFirst({
    where: {
      id: payload.sessionId,
      token,
      expiresAt: { gt: new Date() },
    },
  })

  if (!session) {
    return null
  }

  const employee = await prisma.employee.findUnique({
    where: { id: payload.employeeId },
  })

  return employee
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  const payload = verifyToken(token)
  if (payload) {
    await prisma.session.deleteMany({
      where: { id: payload.sessionId },
    })
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

/**
 * Helper to return a JSON error response
 */
export function authError(message: string, status: number = 401) {
  return Response.json(
    { success: false, message, data: null },
    { status }
  )
}

/**
 * Helper to check if employee is admin (dept_admin or super_admin)
 */
export function isAdmin(employee: Employee): boolean {
  return employee.helpdeskRole === "DEPT_ADMIN" || employee.helpdeskRole === "SUPER_ADMIN"
}

/**
 * Helper to check if employee is super admin
 */
export function isSuperAdmin(employee: Employee): boolean {
  return employee.helpdeskRole === "SUPER_ADMIN"
}

/**
 * Get the Odoo token from the session associated with this request.
 * Returns undefined if not found.
 */
export async function getSessionOdooToken(request: NextRequest): Promise<string | undefined> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return undefined

  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload) return undefined

  const session = await prisma.session.findFirst({
    where: { id: payload.sessionId, token, expiresAt: { gt: new Date() } },
    select: { odooToken: true },
  })

  return session?.odooToken ?? undefined
}
