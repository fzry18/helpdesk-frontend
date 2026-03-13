import type { Message, Ticket } from "@/types"

export type WSEvent =
  | { type: "ticket_status_changed"; ticket_id: number; data: Partial<Ticket> }
  | { type: "ticket_assigned"; ticket_id: number; data: Partial<Ticket> }
  | { type: "ticket_priority_changed"; ticket_id: number; data: Partial<Ticket> }
  | { type: "message_new"; ticket_id: number; data: Message }
  | { type: "ticket_created"; data?: unknown }
  | { type: "ticket_closed"; ticket_id: number; data: Partial<Ticket> }
  | { type: "notification"; data?: unknown }

export interface ServerToClientEvents {
  ticket_status_changed: (payload: { ticket_id: number; data: Partial<Ticket> }) => void
  ticket_assigned: (payload: { ticket_id: number; data: Partial<Ticket> }) => void
  ticket_priority_changed: (payload: { ticket_id: number; data: Partial<Ticket> }) => void
  message_new: (payload: { ticket_id: number; data: Message }) => void
  ticket_created: (payload: unknown) => void
  ticket_closed: (payload: { ticket_id: number; data: Partial<Ticket> }) => void
  notification: (payload: unknown) => void
}

export interface ClientToServerEvents {
  join_room: (payload: { room: string }) => void
  leave_room: (payload: { room: string }) => void
  ping: () => void
}
