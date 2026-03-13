export interface Employee {
  id: number
  name: string
  nik: string
  department_id: number | null
  department: string
  job_title: string
  email: string
  phone: string
  is_manager?: boolean
  helpdesk_role?: "user" | "dept_admin" | "super_admin"
  operating_unit?: string
}

export interface LoginRequest {
  nik: string
  password: string
}

export interface LoginResponse {
  success: boolean
  data: {
    access_token: string
    token_type: string
    expires_at: string
    employee: Employee
  }
}
