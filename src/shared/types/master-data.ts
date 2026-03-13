export interface Department {
  id: number
  name: string
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
  members?: TeamMember[]
}

export interface Stage {
  id: number
  name: string
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

export interface MasterData {
  categories: Category[]
  types: TicketType[]
  teams: Team[]
  stages: Stage[]
  tags: Tag[]
  priorities: Priority[]
  departments?: Department[]
}
