import type { Category, Priority, Stage, Tag, Team, TicketType } from "@/shared/types/master-data"

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

export interface Ticket {
  id: number
  ticket_number: string
  subject: string
  description: string
  priority: string
  priority_label?: string
  ticket_category_type?: "helper" | "system"
  system_category?: string | null
  waiting_user_confirmation?: boolean
  resolution_confirmed?: boolean
  is_rejected?: boolean
  rejection_reason?: string | null
  rejected_date?: string | null
  stage?: { id: number; name: string; actual_name?: string } | null
  team?: { id: number; name: string } | null
  category?: { id: number; name: string } | null
  ticket_type?: { id: number; name: string } | null
  customer?: { id: number; name: string; email: string; phone: string } | null
  assigned_user?: { id: number; name: string } | null
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

export interface CreateTicketPayload {
  subject: string
  description: string
  priority?: string
  category_id?: number
  ticket_type_id?: number
  team_id?: number
  tags?: number[]
}

export interface TicketMasterData {
  categories: Category[]
  types: TicketType[]
  teams: Team[]
  stages: Stage[]
  tags: Tag[]
  priorities: Priority[]
}
