// Employee - Primary authentication entity (Odoo employee + local role)
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
  helpdesk_role?: 'user' | 'dept_admin' | 'super_admin'
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

export interface Ticket {
  id: number
  ticket_number: string
  subject: string
  description: string
  /** Odoo: "0" (Very Low) .. "4" (Very High) */
  priority: string
  priority_label?: string
  /** helper = Ticketing Helper (manpower/field), system = Ticketing System (Odoo/P2H/Job Portal) */
  ticket_category_type?: "helper" | "system"
  /** Hanya untuk ticket_category_type=system: odoo | p2h | job_portal | other */
  system_category?: string | null
  /** Admin sudah selesai, menunggu user konfirmasi */
  waiting_user_confirmation?: boolean
  resolution_confirmed?: boolean
  /** Rejection fields - ticket ditolak oleh admin */
  is_rejected?: boolean
  rejection_reason?: string | null
  rejected_date?: string | null
  stage?: { id: number; name: string; actual_name?: string } | null
  team?: { id: number; name: string } | null
  category?: { id: number; name: string } | null
  ticket_type?: { id: number; name: string } | null
  customer?: { id: number; name: string; email: string; phone: string } | null
  assigned_user?: { id: number; name: string } | null
  /** Nama anggota tim (employee) yang di-assign - agar pembuat ticket tahu siapa yang mengurusi */
  assigned_employee?: { id: number; name: string } | null
  created_by?: { id: number; name: string } | null
  stage_id?: number
  stage_name?: string
  team_id?: number
  team_name?: string
  category_id?: number
  category_name?: string
  ticket_type_id?: number
  ticket_type_name?: string
  customer_id?: number
  customer_name?: string
  email?: string
  phone?: string
  department_id?: number | null
  department_name?: string | null
  assigned_user_id?: number
  assigned_user_name?: string
  create_date: string
  write_date: string
  start_date?: string | null
  end_date?: string | null
  user_confirmation_request_date?: string | null
  confirmation_date?: string | null
  captured_url?: string
  captured_module?: string
  captured_model?: string
  captured_model_name?: string
  captured_view_type?: string
  captured_menu_path?: string
  captured_record_id?: number | null
  captured_record_ref?: string
  captured_browser?: string
  captured_at?: string
  is_from_floating_button?: boolean
  total_time_spent?: number
  tags?: Tag[]
  products?: Array<{ id: number; name: string }>
  attachments?: Attachment[]
}

export interface Message {
  id: number
  body: string
  body_plain?: string
  author: {
    id: number
    name: string
    email?: string
    image_url?: string
  } | null
  date?: string
  create_date?: string
  message_type?: string
  is_internal?: boolean
  internal?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

export interface Department {
  id: number
  name: string
}

export interface MasterData {
  categories: Category[]
  types: TicketType[]
  teams: Team[]
  stages: Stage[]
  tags: Tag[]
  priorities: Priority[]
  departments?: Department[]
}

export interface Category {
  id: number
  name: string
  sequence?: number
}

export interface TicketType {
  id: number
  name: string
}

/** Team member - sekarang adalah hr.employee (bukan res.users) */
export interface TeamMember {
  id: number
  employee_id: number
  name: string
  nik?: string
  email?: string
  phone?: string
  department_id?: number | null
  department_name?: string | null
  job_title?: string
  user_id?: number | null
}

export interface Team {
  id: number
  name: string
  email?: string
  department_id?: number | null
  department_name?: string | null
  description?: string | null
  is_active?: boolean
  leader?: { id: number; name: string } | null
  leader_employee?: { id: number; name: string; nik?: string } | null
  member_count?: number
  /** Members sekarang adalah hr.employee (bukan res.users) */
  members?: TeamMember[]
}

export interface Stage {
  id: number
  name: string
  /** Nama stage asli di backend (untuk admin) */
  actual_name?: string
  sequence?: number
  is_starting?: boolean
  is_closing?: boolean
  fold?: boolean
}

export interface Tag {
  id: number
  name: string
  color?: number
}

export interface Priority {
  value: string
  label: string
}

export interface Attachment {
  id: number
  name: string
  filename?: string
  mimetype: string
  file_size: number
  checksum?: string
  url: string
  preview_url?: string | null
  create_date?: string | null
  created_by?: { id: number; name: string } | null
}

export interface User {
  id: number
  name: string
  email?: string
  image_url?: string | null
}

// Dashboard types
export interface DashboardSummary {
  summary: {
    total: number
    open: number
    closed: number
    unassigned: number
  }
  period: {
    today: number
    this_week: number
    this_month: number
  }
  by_priority: {
    very_low: number
    low: number
    normal: number
    high: number
    very_high: number
  }
  by_stage: Array<{ id: number; name: string; count: number }>
}

export interface TrendData {
  date: string
  count: number
}

export interface TeamPerformance {
  team: { id: number; name: string }
  summary: {
    total: number
    open: number
    closed: number
    member_count: number
  }
  members: Array<{
    id: number
    name: string
    assigned: number
    closed: number
    open: number
  }>
}

