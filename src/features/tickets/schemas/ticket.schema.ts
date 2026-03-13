import { z } from "zod"

export const ticketPrioritySchema = z.enum(["0", "1", "2", "3", "4"])

export const createTicketSchema = z.object({
  subject: z.string().min(5, "Minimal 5 karakter"),
  description: z.string().min(20, "Minimal 20 karakter"),
  priority: ticketPrioritySchema.default("2"),
  category_id: z.number().positive().optional(),
  team_id: z.number().positive().optional(),
  ticket_category_type: z.enum(["helper", "system"]).optional(),
  system_category: z.enum(["odoo", "p2h", "job_portal", "other"]).optional(),
})

export const updateTicketSchema = createTicketSchema.partial()

export const ticketActionSchema = z.object({
  action: z.string().min(1),
  message: z.string().optional(),
  reason: z.string().optional(),
  stage_id: z.number().positive().optional(),
  employee_id: z.number().positive().optional(),
  team_id: z.number().positive().optional(),
  priority: ticketPrioritySchema.optional(),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type TicketActionInput = z.infer<typeof ticketActionSchema>
