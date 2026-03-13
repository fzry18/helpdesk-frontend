import { NextRequest } from "next/server"

import { getAuthEmployee, authError } from "@/lib/server/auth"
import {
  ticketActionService,
  TicketActionServiceError,
} from "@/lib/server/services/ticket-action.service"
import { formatTicketResponse } from "../../helpers"

type RouteContext = { params: Promise<{ id: string }> }

type TicketActionName =
  | "open"
  | "close"
  | "reject"
  | "request_confirmation"
  | "confirm_resolved"
  | "assign_team"
  | "assign"
  | "set_priority"
  | "update_stage"
  | "post_activity_log"

function parseAction(action?: string): TicketActionName | null {
  if (!action) return null
  const normalized = action.toLowerCase().replace(/-/g, "_")

  switch (normalized) {
    case "open":
    case "close":
    case "reject":
    case "request_confirmation":
    case "confirm_resolved":
    case "assign_team":
    case "assign":
    case "set_priority":
    case "update_stage":
    case "post_activity_log":
      return normalized
    default:
      return null
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const employee = await getAuthEmployee(request)
  if (!employee) return authError("Tidak terautentikasi")

  const { id } = await context.params
  const ticketId = parseInt(id, 10)
  if (Number.isNaN(ticketId)) {
    return Response.json({ success: false, message: "ID ticket tidak valid", data: null }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const action = parseAction(body.action)
  if (!action) {
    return Response.json(
      {
        success: false,
        message: "Action tidak valid",
        data: null,
      },
      { status: 400 }
    )
  }

  const payload = (body.payload && typeof body.payload === "object") ? body.payload : body

  try {
    const result = await (async () => {
      switch (action) {
        case "open":
          return ticketActionService.openTicket(ticketId, employee, payload)
        case "close":
          return ticketActionService.closeTicket(ticketId, employee, payload)
        case "reject":
          return ticketActionService.rejectTicket(ticketId, employee, payload)
        case "request_confirmation":
          return ticketActionService.requestConfirmation(ticketId, employee, payload)
        case "confirm_resolved":
          return ticketActionService.confirmResolved(ticketId, employee, payload)
        case "assign_team":
          return ticketActionService.assignTeam(ticketId, employee, payload)
        case "assign":
          return ticketActionService.assignTicket(ticketId, employee, payload)
        case "set_priority":
          return ticketActionService.setPriority(ticketId, employee, payload)
        case "update_stage":
          return ticketActionService.updateStage(ticketId, employee, payload)
        case "post_activity_log":
          return ticketActionService.postActivityLog(ticketId, employee, payload)
      }
    })()

    const responseData = result.kind === "ticket" ? formatTicketResponse(result.ticket as never) : result.data
    return Response.json({ success: true, data: responseData })
  } catch (error) {
    if (error instanceof TicketActionServiceError) {
      return Response.json({ success: false, message: error.message, data: null }, { status: error.status })
    }

    console.error("Ticket action error:", error)
    return Response.json(
      { success: false, message: "Terjadi kesalahan internal", data: null },
      { status: 500 }
    )
  }
}
