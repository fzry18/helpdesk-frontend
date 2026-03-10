/**
 * Shared helpers for ticket API routes
 */
import { prisma } from "@/lib/server/prisma"
import type { Ticket as PrismaTicket, Employee, TicketPriority, TicketStatus } from "@/generated/prisma"

/**
 * Generate a unique ticket number: HD-YYYYMMDD-XXXX
 */
export async function generateTicketNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
  const prefix = `HD-${dateStr}-`

  // Find the last ticket number for today
  const lastTicket = await prisma.ticket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: "desc" },
    select: { ticketNumber: true },
  })

  let nextNum = 1
  if (lastTicket) {
    const lastNum = parseInt(lastTicket.ticketNumber.split("-").pop() || "0", 10)
    nextNum = lastNum + 1
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`
}

/**
 * Priority mapping
 */
const PRIORITY_MAP: Record<string, TicketPriority> = {
  "0": "VERY_LOW",
  "1": "LOW",
  "2": "NORMAL",
  "3": "HIGH",
  "4": "VERY_HIGH",
  very_low: "VERY_LOW",
  low: "LOW",
  normal: "NORMAL",
  high: "HIGH",
  very_high: "VERY_HIGH",
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  VERY_LOW: "Very Low",
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  VERY_HIGH: "Very High",
}

const PRIORITY_VALUE: Record<TicketPriority, string> = {
  VERY_LOW: "0",
  LOW: "1",
  NORMAL: "2",
  HIGH: "3",
  VERY_HIGH: "4",
}

export function parsePriority(val: string | undefined | null): TicketPriority {
  if (!val) return "NORMAL"
  return PRIORITY_MAP[val.toLowerCase()] || "NORMAL"
}

/**
 * Derive a virtual stage from ticket status when stages table is empty / stage_id is NULL.
 */
function deriveStageFromStatus(status: TicketStatus, isRejected?: boolean | null): { id: number; name: string } {
  if (isRejected) return { id: 0, name: "Rejected" }
  switch (status) {
    case "OPEN": return { id: 0, name: "Sent" }
    case "IN_PROGRESS": return { id: 0, name: "In Progress" }
    case "WAITING_CONFIRMATION": return { id: 0, name: "Waiting Confirmation" }
    case "RESOLVED": return { id: 0, name: "Resolved" }
    case "CLOSED": return { id: 0, name: "Closed" }
    case "REJECTED": return { id: 0, name: "Rejected" }
    default: return { id: 0, name: "Sent" }
  }
}

/**
 * Format ticket for API response (matching frontend Ticket type)
 */
export function formatTicketResponse(ticket: PrismaTicket & {
  createdBy?: Employee | null
  assignedTo?: Employee | null
  category?: { id: number; name: string } | null
  team?: { id: number; name: string } | null
  stage?: { id: number; name: string; sequence?: number; isStarting?: boolean; isClosing?: boolean; fold?: boolean } | null
  tags?: Array<{ tag: { id: number; name: string; color: number } }> | null
  attachments?: Array<{
    id: number; name: string; filename: string; mimetype: string;
    fileSize: number; filePath: string | null; fileData: Uint8Array | null; createdAt: Date
  }> | null
  messages?: Array<unknown> | null
}) {
  // Use DB stage if available, otherwise derive from status
  const stage = ticket.stage
    ? { id: ticket.stage.id, name: ticket.stage.name }
    : deriveStageFromStatus(ticket.status, ticket.isRejected)

  return {
    id: ticket.id,
    ticket_number: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    priority: PRIORITY_VALUE[ticket.priority],
    priority_label: PRIORITY_LABEL[ticket.priority],
    ticket_category_type: ticket.ticketCategoryType?.toLowerCase() || null,
    system_category: ticket.systemCategory,
    waiting_user_confirmation: ticket.waitingUserConfirmation,
    resolution_confirmed: ticket.resolutionConfirmed,
    is_rejected: ticket.isRejected,
    rejection_reason: ticket.rejectionReason,
    rejected_date: ticket.rejectedDate?.toISOString() || null,
    stage,
    team: ticket.team
      ? { id: ticket.team.id, name: ticket.team.name }
      : null,
    category: ticket.category
      ? { id: ticket.category.id, name: ticket.category.name }
      : null,
    stage_id: ticket.stageId,
    stage_name: stage.name,
    team_id: ticket.teamId,
    team_name: ticket.team?.name || null,
    category_id: ticket.categoryId,
    category_name: ticket.category?.name || null,
    department_id: ticket.departmentId,
    department_name: ticket.departmentName,
    assigned_user: ticket.assignedTo
      ? { id: ticket.assignedTo.id, name: ticket.assignedTo.name }
      : null,
    assigned_user_id: ticket.assignedToId,
    assigned_user_name: ticket.assignedTo?.name || null,
    assigned_employee: ticket.assignedTo
      ? { id: ticket.assignedTo.id, name: ticket.assignedTo.name }
      : null,
    created_by: ticket.createdBy
      ? { id: ticket.createdBy.id, name: ticket.createdBy.name }
      : null,
    customer: ticket.createdBy
      ? {
          id: ticket.createdBy.id,
          name: ticket.createdBy.name,
          email: ticket.createdBy.email || "",
          phone: ticket.createdBy.phone || "",
        }
      : null,
    create_date: ticket.createdAt.toISOString(),
    write_date: ticket.updatedAt.toISOString(),
    start_date: ticket.startDate?.toISOString() || null,
    end_date: ticket.endDate?.toISOString() || null,
    user_confirmation_request_date: ticket.userConfirmationRequestDate?.toISOString() || null,
    confirmation_date: ticket.confirmationDate?.toISOString() || null,
    tags: ticket.tags?.map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
    })) || [],
    attachments: ticket.attachments?.map((a) => ({
      id: a.id,
      name: a.name,
      filename: a.filename,
      mimetype: a.mimetype,
      file_size: a.fileSize,
      url: `/api/helpdesk/attachments/${a.id}/download`,
      create_date: a.createdAt.toISOString(),
    })) || [],
  }
}

/**
 * Standard ticket includes for Prisma queries
 */
export const TICKET_INCLUDES = {
  createdBy: true,
  assignedTo: true,
  category: true,
  team: true,
  stage: true,
  tags: {
    include: { tag: true },
  },
  attachments: true,
} as const

/**
 * Map frontend status to Prisma TicketStatus 
 */
export function mapStatusFilter(status: string | undefined): TicketStatus[] | undefined {
  if (!status || status === "all") return undefined
  switch (status) {
    case "draft":
    case "open":
      return ["OPEN"]
    case "in_progress":
      return ["IN_PROGRESS"]
    case "closed":
      return ["RESOLVED", "CLOSED"]
    case "rejected":
      return ["REJECTED"]
    default:
      return undefined
  }
}
