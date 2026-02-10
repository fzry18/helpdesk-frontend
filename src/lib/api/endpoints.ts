import { apiClient } from "./client"
import type {
  LoginRequest,
  LoginResponse,
  Ticket,
  ApiResponse,
  MasterData,
  Message,
  Employee,
  Category,
  Team,
  Stage,
  TicketType,
} from "@/types"

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface CreateTicketPayload {
  subject: string
  description: string
  customer_name?: string
  email?: string
  phone?: string
  department_id?: number
  priority?: string
  category_id?: number
  team_id?: number
  ticket_type_id?: number
  ticket_category_type?: "helper" | "system"
  system_category?: "odoo" | "p2h" | "job_portal" | "other"
  product_ids?: number[]
  tag_ids?: number[]
  attachments?: Array<{ filename: string; file_data: string }>
  captured_url?: string
  captured_module?: string
  captured_model?: string
  captured_view_type?: string
  captured_record_id?: number
  captured_record_ref?: string
  captured_menu_path?: string
  captured_browser?: string
}

// ============================================
// 🔐 AUTH API
// ============================================
export const authAPI = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>("/auth/login", data),

  me: () => apiClient.get<ApiResponse<Employee>>("/auth/me"),

  logout: () => apiClient.post("/auth/logout"),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post("/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    }),
}

// ============================================
// 🎫 TICKET API
// ============================================
export const ticketAPI = {
  list: (params?: {
    page?: number
    limit?: number
    sort?: string
    order?: "asc" | "desc"
    search?: string
    stage_id?: number
    team_id?: number
    category_id?: number
    priority?: string
    assigned_to?: number
    my_tickets?: boolean
    status?: "open" | "closed" | "all"
    ticket_category_type?: "system" | "helper"
    system_category?: string
    waiting_confirmation?: "true" | "false"
  }) =>
    apiClient.get<ApiResponse<Ticket[]> & { meta?: PaginationMeta }>(
      "/tickets",
      { params }
    ),

  get: (id: number) =>
    apiClient.get<ApiResponse<Ticket>>(`/tickets/${id}`),

  getByNumber: (ticketNumber: string) =>
    apiClient.get<ApiResponse<Ticket>>(`/tickets/by-number/${ticketNumber}`),

  create: (data: CreateTicketPayload) =>
    apiClient.post<ApiResponse<Ticket>>("/tickets", data),

  update: (id: number, data: Partial<Ticket>) =>
    apiClient.patch<ApiResponse<Ticket>>(`/tickets/${id}`, data),

  delete: (id: number) => apiClient.delete(`/tickets/${id}`),

  updateStage: (id: number, stageId: number) =>
    apiClient.put<ApiResponse<Ticket>>(`/tickets/${id}/stage`, {
      stage_id: stageId,
    }),

  assignUser: (id: number, userId: number) =>
    apiClient.put<ApiResponse<Ticket>>(`/tickets/${id}/assign`, {
      user_id: userId,
    }),

  /** Admin: Assign by employee (nama yang mengerjakan) - tidak wajib punya User di Odoo */
  assignByEmployee: (id: number, employeeId: number) =>
    apiClient.put<ApiResponse<Ticket>>(`/tickets/${id}/assign`, {
      employee_id: employeeId,
    }),

  assignToMe: (id: number) =>
    apiClient.put<ApiResponse<Ticket>>(`/tickets/${id}/assign`, {
      assign_to_me: true,
    }),

  updatePriority: (id: number, priority: string) =>
    apiClient.patch<ApiResponse<Ticket>>(`/tickets/${id}`, {
      priority,
    }),

  /** Admin: minta konfirmasi user bahwa ticket sudah selesai */
  requestConfirmation: (id: number, message?: string) =>
    apiClient.post<ApiResponse<Ticket>>(`/tickets/${id}/request-confirmation`, {
      message: message || "",
    }),

  /** Admin: langsung close ticket tanpa konfirmasi user */
  closeTicket: (id: number, message?: string) =>
    apiClient.post<ApiResponse<Ticket>>(`/tickets/${id}/close`, {
      message: message || "",
    }),

  /** User: konfirmasi ticket sudah teratasi */
  confirmResolved: (
    id: number,
    data?: { satisfaction?: string; feedback?: string }
  ) =>
    apiClient.post<ApiResponse<Ticket>>(`/tickets/${id}/confirm-resolved`, data || {}),

  // ============================================
  // NEW WORKFLOW ENDPOINTS (sesuai BACKEND_SPEC_WORKFLOW.md)
  // ============================================

  /** Admin: Open/Progress ticket (Draft → In Progress) */
  openTicket: (id: number, message?: string) =>
    apiClient.post<ApiResponse<Ticket>>(`/tickets/${id}/open`, {
      message: message || "",
    }),

  /** Admin: Assign ticket ke team helpdesk */
  assignTeam: (id: number, teamId: number, message?: string) =>
    apiClient.post<ApiResponse<{ id: number; team: { id: number; name: string } }>>(
      `/tickets/${id}/assign-team`,
      { team_id: teamId, message: message || "" }
    ),

  /** Admin: Post activity log (progress update dari manpower) */
  postActivityLog: (
    id: number,
    content: string,
    activityType?: "progress" | "note" | "update"
  ) =>
    apiClient.post<ApiResponse<{ id: number; content: string; activity_type: string; create_date: string }>>(
      `/tickets/${id}/activity-log`,
      { content, activity_type: activityType || "progress" }
    ),

  search: (body: {
    filters?: Array<{ field: string; operator: string; value: string }>
    search?: string
    page?: number
    limit?: number
  }) =>
    apiClient.post<
      ApiResponse<Ticket[]> & { meta?: PaginationMeta }
    >("/tickets/search", body),

  // ============================================
  // REJECT & PRIORITY ENDPOINTS
  // ============================================

  /** Admin: Reject ticket dengan alasan */
  rejectTicket: (id: number, reason: string) =>
    apiClient.post<ApiResponse<Ticket>>(`/tickets/${id}/reject`, {
      reason,
    }),

  /** Admin: Set priority ticket (0-4) */
  setPriority: (id: number, priority: string) =>
    apiClient.post<ApiResponse<{ id: number; priority: string; priority_label: string }>>(
      `/tickets/${id}/priority`,
      { priority }
    ),
}

// ============================================
// 💬 MESSAGE API
// ============================================
export const messageAPI = {
  getMessages: (
    ticketId: number,
    params?: { page?: number; limit?: number; type?: "all" | "comment" | "notification" }
  ) =>
    apiClient.get<ApiResponse<Message[]> & { meta?: PaginationMeta }>(
      `/tickets/${ticketId}/messages`,
      { params }
    ),

  getThread: (ticketId: number) =>
    apiClient.get<ApiResponse<Message[]>>(`/tickets/${ticketId}/thread`),

  postMessage: (
    ticketId: number,
    data: { body: string; internal?: boolean }
  ) =>
    apiClient.post<ApiResponse<Message>>(
      `/tickets/${ticketId}/messages`,
      data
    ),

  reply: (ticketId: number, messageId: number, body: string) =>
    apiClient.post<ApiResponse<Message>>(
      `/tickets/${ticketId}/messages/${messageId}/reply`,
      { body }
    ),

  markRead: (ticketId: number) =>
    apiClient.post(`/tickets/${ticketId}/messages/mark-read`),
}

// ============================================
// 📎 ATTACHMENT API
// ============================================
interface Attachment {
  id: number
  name: string
  file_size: number
  mimetype: string
  create_date: string
  url?: string
}

export const attachmentAPI = {
  getAttachments: (ticketId: number) =>
    apiClient.get<ApiResponse<Attachment[]>>(
      `/tickets/${ticketId}/attachments`
    ),

  upload: (
    ticketId: number,
    files: Array<{ filename: string; file_data: string }>
  ) =>
    apiClient.post<ApiResponse<Attachment[]>>(
      `/tickets/${ticketId}/attachments`,
      { files: files }
    ),

  uploadFiles: (ticketId: number, formData: FormData) =>
    apiClient.post<ApiResponse<Attachment[]>>(
      `/tickets/${ticketId}/attachments/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    ),

  get: (attachmentId: number) =>
    apiClient.get<ApiResponse<Attachment>>(`/attachments/${attachmentId}`),

  download: (attachmentId: number) =>
    apiClient.get(`/attachments/${attachmentId}/download`, {
      responseType: "blob",
    }),

  delete: (attachmentId: number) =>
    apiClient.delete(`/attachments/${attachmentId}`),

  bulkDelete: (ids: number[]) =>
    apiClient.post("/attachments/bulk-delete", { ids }),
}

// ============================================
// 📊 MASTER DATA API
// ============================================
interface Priority {
  value: string
  label: string
}

interface Tag {
  id: number
  name: string
  color: number
}

interface User {
  id: number
  name: string
  email?: string
}

/** Team member type - sekarang adalah hr.employee */
interface TeamMember {
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

export const masterDataAPI = {
  getAll: () => apiClient.get<ApiResponse<MasterData>>("/master-data"),

  getCategories: () =>
    apiClient.get<ApiResponse<Category[]>>("/categories"),

  getTypes: () => apiClient.get<ApiResponse<TicketType[]>>("/types"),

  getTeams: () => apiClient.get<ApiResponse<Team[]>>("/teams"),

  getTeam: (id: number) =>
    apiClient.get<ApiResponse<Team>>(`/teams/${id}`),

  /** Get team members as hr.employee list */
  getTeamMembers: (teamId: number) =>
    apiClient.get<ApiResponse<TeamMember[]>>(`/teams/${teamId}/members`),

  getStages: () => apiClient.get<ApiResponse<Stage[]>>("/stages"),

  getTags: () => apiClient.get<ApiResponse<Tag[]>>("/tags"),

  getPriorities: () =>
    apiClient.get<ApiResponse<Priority[]>>("/priorities"),

  getUsers: (teamId?: number, search?: string) =>
    apiClient.get<ApiResponse<User[]>>("/users", {
      params: { team_id: teamId, search },
    }),
}

// ============================================
// 📈 DASHBOARD API
// ============================================
interface DashboardStats {
  summary: {
    total: number
    open: number
    closed: number
    unassigned: number
    waiting_confirmation?: number
  }
  by_category_type?: { system: number; helper: number }
  by_system_category?: Record<string, number>
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

interface TeamStats {
  id: number
  name: string
  total: number
  open: number
  closed: number
}

interface CategoryStats {
  id: number | null
  name: string
  count: number
}

interface TrendData {
  date: string
  full_date?: string
  count?: number
  created: number
  resolved: number
}

interface MyTicketsResponse {
  stats: {
    total: number
    open: number
    in_progress: number
    closed: number
  }
  tickets: Ticket[]
}

interface TeamPerformance {
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

export const dashboardAPI = {
  getStats: (params?: { team_id?: number; date_from?: string; date_to?: string }) =>
    apiClient.get<ApiResponse<DashboardStats>>("/dashboard", { params }),

  getByTeam: () =>
    apiClient.get<ApiResponse<TeamStats[]>>("/dashboard/by-team"),

  getByCategory: () =>
    apiClient.get<ApiResponse<CategoryStats[]>>("/dashboard/by-category"),

  getRecent: (limit: number = 10) =>
    apiClient.get<ApiResponse<Ticket[]>>("/dashboard/recent", {
      params: { limit },
    }),

  getMyTickets: () =>
    apiClient.get<ApiResponse<MyTicketsResponse>>("/dashboard/my-tickets"),

  getTrends: (period?: "week" | "month" | "quarter" | "year", teamId?: number) =>
    apiClient.get<ApiResponse<TrendData[]>>("/dashboard/trends", {
      params: { period, team_id: teamId },
    }),

  getTopCustomers: (limit: number = 10) =>
    apiClient.get<
      ApiResponse<Array<{ customer_id: number; name: string; email: string; ticket_count: number }>>
    >("/dashboard/top-customers", { params: { limit } }),

  getTeamPerformance: (teamId: number) =>
    apiClient.get<ApiResponse<TeamPerformance>>("/dashboard/team-performance", {
      params: { team_id: teamId },
    }),
}
