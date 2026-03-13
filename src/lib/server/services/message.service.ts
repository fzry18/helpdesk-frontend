import type { Employee } from "@/generated/prisma"

import { activityLogRepository } from "@/lib/server/repositories/activity-log.repository"
import { messageRepository } from "@/lib/server/repositories/message.repository"
import { ticketRepository } from "@/lib/server/repositories/ticket.repository"

export class MessageServiceError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export const serverMessageService = {
  async getThread(ticketId: number, employee: Employee, isAdmin: boolean) {
    const ticket = await ticketRepository.findByIdBasic(ticketId)
    if (!ticket) {
      throw new MessageServiceError("Ticket tidak ditemukan", 404)
    }

    if (!isAdmin && ticket.createdById !== employee.id) {
      throw new MessageServiceError("Akses ditolak", 403)
    }

    const [messages, activities] = await Promise.all([
      messageRepository.listByTicketId(ticketId),
      activityLogRepository.listByTicketId(ticketId),
    ])

    return { messages, activities }
  },

  async postMessage(
    ticketId: number,
    employee: Employee,
    body: { content: string; internal?: boolean },
    isAdmin: boolean
  ) {
    const ticket = await ticketRepository.findByIdBasic(ticketId)
    if (!ticket) {
      throw new MessageServiceError("Ticket tidak ditemukan", 404)
    }

    if (!isAdmin && ticket.createdById !== employee.id) {
      throw new MessageServiceError("Akses ditolak", 403)
    }

    if (!body.content?.trim()) {
      throw new MessageServiceError("Pesan tidak boleh kosong", 400)
    }

    const cleanedBody = body.content.trim()
    const isInternal = body.internal === true && isAdmin

    return messageRepository.create({
      ticketId,
      authorId: employee.id,
      body: cleanedBody,
      bodyPlain: cleanedBody.replace(/<[^>]*>/g, ""),
      isInternal,
      messageType: isInternal ? "note" : "comment",
    })
  },
}
