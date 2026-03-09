/**
 * Odoo Employee API Client
 * Handles authentication and employee data from Odoo
 */

const ODOO_API_BASE = process.env.ODOO_API_BASE_URL || "http://10.1.1.107:8069/api/v1"
const ODOO_FETCH_TIMEOUT = 15000 // 15 seconds

/** Build headers for Odoo API calls, with optional Bearer token */
function odooHeaders(token?: string): Record<string, string> {
  if (token) return { Authorization: `Bearer ${token}` }
  return {}
}

/** Fetch with timeout using AbortController */
function fetchWithTimeout(url: string, options?: RequestInit & { timeout?: number }): Promise<Response> {
  const timeout = options?.timeout ?? ODOO_FETCH_TIMEOUT
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export interface OdooLoginResponse {
  message: string
  data: {
    token_type: string
    nik: string
    token: string
    employee_id: number
    name: string
    scope: string
    operating_unit: string
    expires_at: string
  } | null
  success: boolean
  code?: string
}

export interface OdooEmployeeData {
  id: number
  nik: string
  name?: string | null
  display_name: string
  fal_firstname_lastname?: string | null
  email?: string | null
  work_email?: string | null
  mobile_phone?: string | null
  phone_contact?: string | null
  department_id?: [number, string] | null
  job_id?: [number, string] | null
  operating_unit?: [number, string] | null
  gender?: string | null
  company_id?: [number, string] | null
  working_status?: string | null
  working_location?: string | null
  parent_id?: [number, string] | null
  is_manager?: boolean
  city?: string | null
  birthday?: string | null
  education_level?: string | null
  hired_date?: string | null
  marital?: string | null
  identification_id?: string | null
  religion?: string | null
}

/**
 * Parse employee name from Odoo response.
 * Odoo returns display_name as "NIK - Name" or just "Name".
 * Falls back to fal_firstname_lastname, then name, then display_name.
 */
export function parseOdooEmployeeName(emp: OdooEmployeeData): string {
  // Try name field first (sometimes available)
  if (emp.name && typeof emp.name === "string" && emp.name.trim()) {
    return emp.name.trim()
  }
  // Try fal_firstname_lastname
  if (emp.fal_firstname_lastname && typeof emp.fal_firstname_lastname === "string" && emp.fal_firstname_lastname.trim()) {
    return emp.fal_firstname_lastname.trim()
  }
  // Parse from display_name: "NIK - Name" or just "Name"
  if (emp.display_name) {
    const parts = emp.display_name.split(" - ")
    if (parts.length >= 2) {
      return parts.slice(1).join(" - ").trim()
    }
    return emp.display_name.trim()
  }
  return ""
}

export interface OdooGetMeResponse {
  message: string
  data: {
    nik: string
    employee_id: number
    name: string
    scope: string
    token_expires_at: string
    operating_unit: string
    type: string
    is_super_admin: boolean
  } | null
  success: boolean
}

export interface OdooEmployeeListResponse {
  message: string
  meta: {
    count: number
    total: number
    limit: number
    offset: number
    filters_applied?: string[]
  }
  data: OdooEmployeeData[] | null
  success: boolean
}

export interface OdooChangePasswordResponse {
  message: string
  data: {
    nik: string
    employee_id: number
    name: string
  } | null
  success: boolean
}

/**
 * Login employee via Odoo API
 */
export async function odooEmployeeLogin(
  nik: string,
  password: string
): Promise<OdooLoginResponse> {
  const body = new URLSearchParams({ nik, password, ttl_hours: "24" })

  const res = await fetchWithTimeout(`${ODOO_API_BASE}/auth/employee-login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  const data: OdooLoginResponse = await res.json()
  return data
}

/**
 * Search employees by name.
 * Odoo's f_name filter does NOT work, so we fetch all employees (paginated)
 * and filter server-side by display_name.
 * Results are cached for 5 minutes to avoid repeated full fetches.
 */
let _employeeCache: { data: OdooEmployeeData[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getAllEmployees(token?: string): Promise<OdooEmployeeData[]> {
  if (_employeeCache && Date.now() - _employeeCache.timestamp < CACHE_TTL) {
    return _employeeCache.data
  }

  // Fetch first page to get total
  const first = await fetchWithTimeout(
    `${ODOO_API_BASE}/employee?limit=1000&offset=0`,
    { headers: odooHeaders(token) }
  )
  const firstRes: OdooEmployeeListResponse = await first.json()
  if (!firstRes.success || !firstRes.data) return []

  const total = firstRes.meta.total
  const allData: OdooEmployeeData[] = [...firstRes.data]

  // Fetch remaining pages
  const remaining = Math.ceil((total - 1000) / 1000)
  for (let i = 1; i <= remaining; i++) {
    const page = await fetchWithTimeout(
      `${ODOO_API_BASE}/employee?limit=1000&offset=${i * 1000}`,
      { headers: odooHeaders(token) }
    )
    const pageRes: OdooEmployeeListResponse = await page.json()
    if (pageRes.success && pageRes.data) {
      allData.push(...pageRes.data)
    }
  }

  _employeeCache = { data: allData, timestamp: Date.now() }
  return allData
}

export async function odooSearchEmployeeByName(
  name: string,
  token?: string
): Promise<OdooEmployeeListResponse> {
  const all = await getAllEmployees(token)
  const q = name.toLowerCase()
  const filtered = all.filter((emp) => {
    const empName = parseOdooEmployeeName(emp).toLowerCase()
    const displayName = (emp.display_name || "").toLowerCase()
    return empName.includes(q) || displayName.includes(q)
  })

  return {
    success: true,
    message: "OK",
    meta: { count: filtered.length, total: filtered.length, limit: filtered.length, offset: 0 },
    data: filtered.slice(0, 50), // Limit to 50 results
  }
}

/**
 * Search employee by NIK (Odoo uses ilike, may return partial matches)
 */
export async function odooSearchEmployeeByNik(
  nik: string,
  token?: string
): Promise<OdooEmployeeListResponse> {
  const res = await fetchWithTimeout(
    `${ODOO_API_BASE}/employee?f_nik=${encodeURIComponent(nik)}`,
    { headers: odooHeaders(token) }
  )
  return res.json()
}

/**
 * Find exact employee by NIK from Odoo results.
 * Odoo's f_nik uses ilike so "2.0524.219" also matches "02.0524.219".
 * This function fetches from Odoo then returns only the exact NIK match.
 */
export async function odooFindEmployeeByNik(
  nik: string,
  token?: string
): Promise<{ success: boolean; data: OdooEmployeeData | null }> {
  const res = await odooSearchEmployeeByNik(nik, token)
  if (!res.success || !res.data || res.data.length === 0) {
    return { success: false, data: null }
  }
  // Find exact NIK match (Odoo ilike can return partial matches)
  const exact = res.data.find((e) => e.nik === nik)
  return { success: !!exact, data: exact || null }
}

/**
 * Get all employees (paginated)
 */
export async function odooGetEmployees(
  limit?: number,
  offset?: number,
  token?: string
): Promise<OdooEmployeeListResponse> {
  const params = new URLSearchParams()
  if (limit) params.set("limit", String(limit))
  if (offset) params.set("offset", String(offset))
  const qs = params.toString()

  const res = await fetchWithTimeout(
    `${ODOO_API_BASE}/employee${qs ? `?${qs}` : "?"}`,
    { headers: odooHeaders(token) }
  )
  return res.json()
}

/**
 * Change employee password via Odoo API
 */
/**
 * Get current employee info from Odoo (includes is_super_admin)
 * Requires Odoo Bearer token from login
 */
export async function odooGetMe(
  odooToken: string
): Promise<OdooGetMeResponse> {
  const res = await fetchWithTimeout(
    `${ODOO_API_BASE}/auth/me?app_name=help-desk`,
    { headers: { Authorization: `Bearer ${odooToken}` } }
  )
  return res.json()
}

/**
 * Change employee password via Odoo API
 */
export async function odooChangePassword(
  nik: string,
  oldPassword: string,
  newPassword: string
): Promise<OdooChangePasswordResponse> {
  const body = new URLSearchParams({
    nik,
    old_password: oldPassword,
    new_password: newPassword,
  })

  const res = await fetchWithTimeout(`${ODOO_API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  return res.json()
}

export interface OdooDepartmentData {
  id: number
  name: string
  code?: string | null
  total_employee: number
}

export interface OdooDepartmentListResponse {
  message: string
  meta: { count: number; total: number; limit: number; offset: number }
  data: OdooDepartmentData[] | null
  success: boolean
}

/**
 * Get all departments from Odoo
 */
export async function odooGetDepartments(
  token?: string
): Promise<OdooDepartmentListResponse> {
  const res = await fetchWithTimeout(`${ODOO_API_BASE}/hr-department`, {
    headers: odooHeaders(token),
  })
  return res.json()
}
