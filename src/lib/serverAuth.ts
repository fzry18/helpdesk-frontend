import jwt from "jsonwebtoken"
import { prisma } from "./prisma"
import { serverAxios } from "./serverAxios"

const JWT_SECRET = process.env.JWT_SECRET || "helpdesk-dev-secret-change-in-production"
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "24h"
const ODOO_BASE_URL = process.env.ODOO_BASE_URL || "https://erp1.gpedata.id"
const ODOO_API_KEY = process.env.ODOO_API_KEY || ""

// ============================================
// JWT Helpers
// ============================================

export interface JwtPayload {
  employeeId: number
  nik: string
  name: string
  isSuperAdmin: boolean
  roles: string[]
  permissions: string[]
  odooToken?: string
}

// In-memory cache for active Odoo tokens
const odooSessionCache = new Map<number, string>()

export function setOdooSession(employeeId: number, token: string) {
  if (token) {
    odooSessionCache.set(employeeId, token)
  }
}

export function getOdooSession(employeeId: number): string | undefined {
  return odooSessionCache.get(employeeId)
}

export function signJwt(payload: JwtPayload): string {
  // Parse JWT_EXPIRATION to seconds (default 24h = 86400s)
  const expiresIn = parseExpiration(JWT_EXPIRATION)
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

function parseExpiration(val: string): number {
  const match = val.match(/^(\d+)(h|m|s|d)?$/)
  if (!match) return 86400 // default 24h
  const num = parseInt(match[1])
  switch (match[2]) {
    case "d": return num * 86400
    case "h": return num * 3600
    case "m": return num * 60
    case "s": return num
    default: return num
  }
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

// ============================================
// Odoo Live Auth
// ============================================

export interface OdooLoginResult {
  success: boolean
  data?: {
    employee_id: number
    nik: string
    name: string
    email?: string
    phone?: string
    department_id?: number
    department?: string
    job_title?: string
    operating_unit?: string
    access_token?: string
    token?: string
    is_super_admin?: boolean
    is_admin?: boolean
    managed_apps?: string[]
  }
  message?: string
}

/**
 * Login to Odoo Live with full NIK and password.
 * Menggunakan endpoint resmi dari Postman Collection:
 * 1. POST /api/v1/auth/employee-login
 * 2. GET /api/v1/auth/me (Get Profile Me)
 * 3. GET /api/v1/employee?f_nik=... (Get Employee details)
 */
export async function loginToOdoo(
  nik: string,
  password: string
): Promise<OdooLoginResult> {
  const formData = new URLSearchParams()
  formData.append("nik", nik)
  formData.append("password", password)
  formData.append("ttl_hours", "24")

  const response = await serverAxios.post(
    `${ODOO_BASE_URL}/api/v1/auth/employee-login`,
    formData.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-API-Key": ODOO_API_KEY,
      },
    }
  )

  const result: OdooLoginResult = response.data
  if (!result.success || !result.data) {
    return result
  }

  const token = result.data.token || result.data.access_token

  if (token) {
    const authHeaders = { Authorization: `Bearer ${token}` }

    // 1. Ambil Profile Me (/api/v1/auth/me) sesuai dokumentasi Postman
    try {
      const meRes = await serverAxios.get(`${ODOO_BASE_URL}/api/v1/auth/me`, {
        headers: authHeaders,
      })
      const meData = meRes.data?.data || meRes.data
      if (meData && typeof meData === "object") {
        if (meData.department && !result.data.department) result.data.department = meData.department
        if (meData.department_id && !result.data.department_id) result.data.department_id = meData.department_id
        if (meData.job_title && !result.data.job_title) result.data.job_title = meData.job_title
        if (meData.email && !result.data.email) result.data.email = meData.email
        if (meData.phone && !result.data.phone) result.data.phone = meData.phone
        if (meData.operating_unit && !result.data.operating_unit) result.data.operating_unit = meData.operating_unit
      }
    } catch (meErr) {
      console.warn("[loginToOdoo] Failed to fetch /api/v1/auth/me:", meErr)
    }

    // 2. Ambil detail karyawan (/api/v1/employee?f_nik=...) jika departemen / jabatan belum lengkap
    if (!result.data.department || !result.data.job_title) {
      try {
        const empRes = await serverAxios.get(
          `${ODOO_BASE_URL}/api/v1/employee?f_nik=${encodeURIComponent(nik)}`,
          { headers: authHeaders }
        )
        const empData = empRes.data?.data
        const empList = Array.isArray(empData) ? empData : empData ? [empData] : []
        if (empList.length > 0) {
          const emp = empList[0]
          const dept = Array.isArray(emp.department_id) ? emp.department_id[1] : (emp.department || emp.department_name)
          const job = Array.isArray(emp.job_id) ? emp.job_id[1] : (emp.job_title || emp.job_name)
          const unit = Array.isArray(emp.operating_unit_id) ? emp.operating_unit_id[1] : emp.operating_unit

          if (dept && !result.data.department) result.data.department = dept
          if (job && !result.data.job_title) result.data.job_title = job
          if (unit && !result.data.operating_unit) result.data.operating_unit = unit
          if (emp.work_email && !result.data.email) result.data.email = emp.work_email
          if (emp.work_phone && !result.data.phone) result.data.phone = emp.work_phone
        }
      } catch (empErr) {
        console.warn("[loginToOdoo] Failed to fetch /api/v1/employee:", empErr)
      }
    }
  }

  return result
}

/**
 * Check if employee has admin/super_admin access for helpdesk app in Odoo.
 */
export async function checkOdooAppAccess(
  odooToken: string,
  nik?: string,
  employeeId?: number
): Promise<{ isAdmin: boolean; isSuperAdmin: boolean }> {
  try {
    const response = await serverAxios.get(
      `${ODOO_BASE_URL}/api/v1/app-access?app_name=helpdesk`,
      {
        headers: {
          "X-API-Key": ODOO_API_KEY,
          Authorization: `Bearer ${odooToken}`,
        },
      }
    )

    const data = response.data
    if (data?.success && data?.data) {
      const accessList = Array.isArray(data.data) ? data.data : [data.data]
      const userAccess = accessList.find(
        (item: { nik?: string; employee_id?: number }) =>
          (nik && item.nik === nik) || (employeeId && item.employee_id === employeeId)
      )

      if (userAccess) {
        return {
          isAdmin: Boolean(userAccess.is_admin || userAccess.is_super_admin),
          isSuperAdmin: Boolean(userAccess.is_super_admin),
        }
      }

      // If user isn't found by exact match, check general flags if only one record
      const hasAnySuper = accessList.some((i: any) => i.is_super_admin)
      const hasAnyAdmin = accessList.some((i: any) => i.is_admin)
      return { isAdmin: hasAnyAdmin || hasAnySuper, isSuperAdmin: hasAnySuper }
    }
    return { isAdmin: false, isSuperAdmin: false }
  } catch (error) {
    console.warn("[checkOdooAppAccess] Failed to check app-access:", error)
    return { isAdmin: false, isSuperAdmin: false }
  }
}

// ============================================
// Local RBAC Helpers
// ============================================

/**
 * Get local RBAC roles & permissions for an employee.
 */
export async function getLocalRbac(
  employeeId: number,
  isSuperAdmin: boolean
): Promise<{ roles: string[]; permissions: string[] }> {
  if (isSuperAdmin) {
    return {
      roles: ["SUPER_ADMIN"],
      permissions: [
        "ticket:create",
        "ticket:view_own",
        "ticket:view_all",
        "ticket:assign",
        "ticket:update_stage",
        "ticket:internal_note",
        "ticket:request_confirm",
        "ticket:confirm_resolved",
        "master:manage",
        "rbac:manage",
      ],
    }
  }

  try {
    const userRoles = await prisma.userRole.findMany({
      where: { employeeId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    })

    const roles = userRoles.map((ur) => ur.role.slug)
    const permissionSet = new Set<string>()
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        permissionSet.add(rp.permission.slug)
      }
    }

    // Default to USER role permissions if no roles assigned
    if (roles.length === 0) {
      return {
        roles: ["USER"],
        permissions: [
          "ticket:create",
          "ticket:view_own",
          "ticket:confirm_resolved",
        ],
      }
    }

    return {
      roles,
      permissions: Array.from(permissionSet),
    }
  } catch (error) {
    console.error("[getLocalRbac] Failed to resolve roles:", error)
    return {
      roles: ["USER"],
      permissions: [
        "ticket:create",
        "ticket:view_own",
        "ticket:confirm_resolved",
      ],
    }
  }
}

/**
 * Upsert employee data from Odoo login response into local DB.
 */
export async function upsertEmployee(data: {
  employee_id: number
  nik: string
  name: string
  email?: string
  phone?: string
  department_id?: number
  department?: string
  job_title?: string
  operating_unit?: string
  isSuperAdmin: boolean
}) {
  const dept =
    data.department ||
    (data.nik === "1.1025.274" ? "IT (Informasi Teknologi)" : undefined)
  const job =
    data.job_title ||
    (data.nik === "1.1025.274" ? "OJT IT" : undefined)
  const deptId =
    data.department_id ||
    (data.nik === "1.1025.274" ? 1047 : undefined)

  const updateData: any = {
    nik: data.nik,
    name: data.name,
    isSuperAdmin: data.isSuperAdmin,
  }
  if (data.email) updateData.email = data.email
  if (data.phone) updateData.phone = data.phone
  if (deptId) updateData.departmentId = deptId
  if (dept) updateData.department = dept
  if (job) updateData.jobTitle = job
  if (data.operating_unit) updateData.operatingUnit = data.operating_unit

  return prisma.employee.upsert({
    where: { id: data.employee_id },
    update: updateData,
    create: {
      id: data.employee_id,
      nik: data.nik,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      departmentId: deptId || null,
      department: dept || null,
      jobTitle: job || null,
      operatingUnit: data.operating_unit || null,
      isSuperAdmin: data.isSuperAdmin,
    },
  })
}

/**
 * Extract bearer token from Authorization header.
 */
export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  return authHeader.slice(7)
}

/**
 * Verify JWT from request and return payload.
 */
export function verifyRequest(
  authHeader: string | null
): JwtPayload | null {
  const token = extractBearerToken(authHeader)
  if (!token) return null
  try {
    return verifyJwt(token)
  } catch {
    return null
  }
}
