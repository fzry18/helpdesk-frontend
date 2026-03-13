import type { Employee, TicketPriority } from "@/generated/prisma"
import { prisma } from "@/lib/server/prisma"
import { isAdmin } from "@/lib/server/auth"

const ticketIncludes = {
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

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  VERY_LOW: "Very Low",
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  VERY_HIGH: "Very High",
}

const PRIORITY_MAP: Record<string, TicketPriority> = {
  "0": "VERY_LOW",
  "1": "LOW",
  "2": "NORMAL",
  "3": "HIGH",
  "4": "VERY_HIGH",
  VERY_LOW: "VERY_LOW",
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  VERY_HIGH: "VERY_HIGH",
}

export class TicketActionServiceError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export type TicketActionResult =
  | { kind: "ticket"; ticket: unknown }
  | { kind: "data"; data: unknown }

function toPriority(value: string | undefined): TicketPriority {
  if (!value) return "NORMAL"
  return PRIORITY_MAP[value.toUpperCase()] ?? "NORMAL"
}

async function getClosingStageId(): Promise<number | null> {
  const stage = await prisma.stage.findFirst({ where: { isClosing: true, isActive: true } })
  return stage?.id ?? null
}

async function getTicketOrThrow(ticketId: number) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) {
    throw new TicketActionServiceError("Ticket tidak ditemukan", 404)
  }
  return ticket
}

function assertAdmin(employee: Employee, message = "Akses ditolak") {
  if (!isAdmin(employee)) {
    throw new TicketActionServiceError(message, 403)
  }
}

export const ticketActionService = {
  async openTicket(ticketId: number, employee: Employee, payload: { message?: string }): Promise<TicketActionResult> {
    assertAdmin(employee, "Hanya admin yang dapat membuka ticket")

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "IN_PROGRESS",
        startDate: new Date(),
      },
      include: ticketIncludes,
    })

    await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: "status_change",
        content: payload.message || `Ticket dibuka oleh ${employee.name}`,
        metadata: { old_status: "OPEN", new_status: "IN_PROGRESS" },
      },
    })

    return { kind: "ticket", ticket: updated }
  },

  async closeTicket(ticketId: number, employee: Employee, payload: { message?: string }): Promise<TicketActionResult> {
    assertAdmin(employee, "Hanya admin yang dapat menutup ticket")

    const closingStageId = await getClosingStageId()
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "CLOSED",
        endDate: new Date(),
        ...(closingStageId ? { stageId: closingStageId } : {}),
      },
      include: ticketIncludes,
    })

    await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: "status_change",
        content: payload.message || `Ticket ditutup oleh ${employee.name}`,
        metadata: { new_status: "CLOSED" },
      },
    })

    return { kind: "ticket", ticket: updated }
  },

  async rejectTicket(ticketId: number, employee: Employee, payload: { reason?: string }): Promise<TicketActionResult> {
    assertAdmin(employee, "Hanya admin yang dapat menolak ticket")
    if (!payload.reason) {
      throw new TicketActionServiceError("Alasan penolakan harus diisi", 400)
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "REJECTED",
        isRejected: true,
        rejectionReason: payload.reason,
        rejectedDate: new Date(),
      },
      include: ticketIncludes,
    })

    await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: "status_change",
        content: `Ticket ditolak: ${payload.reason}`,
        metadata: { new_status: "REJECTED", reason: payload.reason },
      },
    })

    return { kind: "ticket", ticket: updated }
  },

  async requestConfirmation(
    ticketId: number,
    employee: Employee,
    payload: { message?: string }
  ): Promise<TicketActionResult> {
    assertAdmin(employee)

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "WAITING_CONFIRMATION",
        waitingUserConfirmation: true,
        userConfirmationRequestDate: new Date(),
      },
      include: ticketIncludes,
    })

    await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: "status_change",
        content: payload.message || "Menunggu konfirmasi dari user",
        metadata: { new_status: "WAITING_CONFIRMATION" },
      },
    })

    return { kind: "ticket", ticket: updated }
  },

  async confirmResolved(
    ticketId: number,
    employee: Employee,
    payload: { satisfaction?: string; feedback?: string }
  ): Promise<TicketActionResult> {
    const ticket = await getTicketOrThrow(ticketId)
    if (ticket.createdById !== employee.id) {
      throw new TicketActionServiceError("Hanya pembuat ticket yang dapat konfirmasi", 403)
    }

    const closingStageId = await getClosingStageId()

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "RESOLVED",
        resolutionConfirmed: true,
        waitingUserConfirmation: false,
        confirmationDate: new Date(),
        endDate: new Date(),
        ...(closingStageId ? { stageId: closingStageId } : {}),
      },
      include: ticketIncludes,
    })

    await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: "status_change",
        content: `Ticket dikonfirmasi selesai oleh ${employee.name}`,
        metadata: {
          new_status: "RESOLVED",
          satisfaction: payload.satisfaction,
          feedback: payload.feedback,
        },
      },
    })

    return { kind: "ticket", ticket: updated }
  },

  async assignTeam(
    ticketId: number,
    employee: Employee,
    payload: { team_id?: number; employee_id?: number; message?: string }
  ): Promise<TicketActionResult> {
    assertAdmin(employee)

    if (!payload.team_id) {
      throw new TicketActionServiceError("team_id diperlukan", 400)
    }

    const team = await prisma.team.findUnique({ where: { id: payload.team_id } })
    if (!team) {
      throw new TicketActionServiceError("Team tidak ditemukan", 404)
    }

    const updateData: Record<string, unknown> = { teamId: payload.team_id }
    let assignee: { name: string } | null = null

    if (payload.employee_id) {
      assignee = await prisma.employee.findUnique({
        where: { id: payload.employee_id },
        select: { name: true },
      })

      if (assignee) {
        updateData.assignedToId = payload.employee_id
        updateData.status = "IN_PROGRESS"
        updateData.startDate = new Date()
      }
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    })

    let logContent = `Ticket di-assign ke team ${team.name}`
    if (assignee) {
      logContent += `, ditangani oleh ${assignee.name}`
    }

    await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: "team_assignment",
        content: payload.message || logContent,
      },
    })

    return {
      kind: "data",
      data: {
        id: ticketId,
        team: { id: team.id, name: team.name },
        assignee: assignee ? { name: assignee.name } : null,
      },
    }
  },

  async assignTicket(
    ticketId: number,
    employee: Employee,
    payload: { employee_id?: number; user_id?: number; assign_to_me?: boolean }
  ): Promise<TicketActionResult> {
    assertAdmin(employee, "Hanya admin yang dapat assign ticket")

    let assigneeId: number | null = null
    if (payload.assign_to_me) {
      assigneeId = employee.id
    } else if (payload.employee_id) {
      assigneeId = payload.employee_id
    } else if (payload.user_id) {
      assigneeId = payload.user_id
    }

    if (!assigneeId) {
      throw new TicketActionServiceError("employee_id atau assign_to_me diperlukan", 400)
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: assigneeId,
        status: "IN_PROGRESS",
        startDate: new Date(),
      },
      include: ticketIncludes,
    })

    const assignee = await prisma.employee.findUnique({ where: { id: assigneeId }, select: { name: true } })
    await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: "assignment",
        content: `Ticket di-assign ke member ${assignee?.name || `#${assigneeId}`}`,
      },
    })

    return { kind: "ticket", ticket: updated }
  },

  async setPriority(
    ticketId: number,
    employee: Employee,
    payload: { priority?: string }
  ): Promise<TicketActionResult> {
    assertAdmin(employee)

    const mappedPriority = toPriority(payload.priority)
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority: mappedPriority },
    })

    return {
      kind: "data",
      data: {
        id: ticketId,
        priority: payload.priority ?? "2",
        priority_label: PRIORITY_LABELS[mappedPriority],
      },
    }
  },

  async updateStage(
    ticketId: number,
    employee: Employee,
    payload: { stage_id?: number }
  ): Promise<TicketActionResult> {
    assertAdmin(employee)

    if (!payload.stage_id) {
      throw new TicketActionServiceError("stage_id diperlukan", 400)
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { stageId: payload.stage_id },
      include: ticketIncludes,
    })

    return { kind: "ticket", ticket: updated }
  },

  async postActivityLog(
    ticketId: number,
    employee: Employee,
    payload: { content?: string; activity_type?: "progress" | "note" | "update" }
  ): Promise<TicketActionResult> {
    assertAdmin(employee)

    if (!payload.content) {
      throw new TicketActionServiceError("content diperlukan", 400)
    }

    const activity = await prisma.activityLog.create({
      data: {
        ticketId,
        employeeId: employee.id,
        activityType: payload.activity_type || "progress",
        content: payload.content,
      },
    })

    return {
      kind: "data",
      data: {
        id: activity.id,
        content: activity.content,
        activity_type: activity.activityType,
        create_date: activity.createdAt.toISOString(),
      },
    }
  },
}
