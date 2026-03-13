import {
  messageAPI,
  ticketAPI,
  type CreateTicketPayload,
  type PaginationMeta,
} from "@/lib/api/endpoints"
import type { Ticket } from "@/types"

export type TicketFilters = {
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
}

export type TicketListResponse = { data: Ticket[]; meta?: PaginationMeta }

export const ticketService = {
  list: (filters?: TicketFilters) => ticketAPI.list(filters),
  get: (id: number) => ticketAPI.get(id),
  create: (data: CreateTicketPayload) => ticketAPI.create(data),
  update: (id: number, data: Partial<Ticket>) => ticketAPI.update(id, data),
  performAction: (id: number, action: string, payload?: Record<string, unknown>) =>
    ticketAPI.performAction(id, action, payload),

  updateStage: (id: number, stageId: number) => ticketAPI.updateStage(id, stageId),
  openTicket: (id: number, message?: string) => ticketAPI.openTicket(id, message),
  closeTicket: (id: number, message?: string) => ticketAPI.closeTicket(id, message),
  rejectTicket: (id: number, reason: string) => ticketAPI.rejectTicket(id, reason),
  requestConfirmation: (id: number, message?: string) =>
    ticketAPI.requestConfirmation(id, message),
  confirmResolved: (id: number, data?: { satisfaction?: string; feedback?: string }) =>
    ticketAPI.confirmResolved(id, data),

  assignByEmployee: (id: number, employeeId: number) => ticketAPI.assignByEmployee(id, employeeId),
  assignToMe: (id: number) => ticketAPI.assignToMe(id),
  assignTeam: (id: number, teamId: number, employeeId?: number, message?: string) =>
    ticketAPI.assignTeam(id, teamId, employeeId, message),

  setPriority: (id: number, priority: string) => ticketAPI.setPriority(id, priority),
  postActivityLog: (
    id: number,
    content: string,
    activityType?: "progress" | "note" | "update"
  ) => ticketAPI.postActivityLog(id, content, activityType),

  getThread: (ticketId: number) => messageAPI.getThread(ticketId),
  getMessages: (
    ticketId: number,
    params?: { page?: number; limit?: number; type?: "all" | "comment" | "notification" }
  ) => messageAPI.getMessages(ticketId, params),
  postMessage: (ticketId: number, data: { body: string; internal?: boolean }) =>
    messageAPI.postMessage(ticketId, data),
}

export type { CreateTicketPayload }
