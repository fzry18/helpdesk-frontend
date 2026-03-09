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
  name: string
  display_name: string
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
 * Search employees by name
 */
export async function odooSearchEmployeeByName(
  name: string,
  token?: string
): Promise<OdooEmployeeListResponse> {
  const res = await fetchWithTimeout(
    `${ODOO_API_BASE}/employee?f_name=${encodeURIComponent(name)}`,
    { headers: odooHeaders(token) }
  )
  return res.json()
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
