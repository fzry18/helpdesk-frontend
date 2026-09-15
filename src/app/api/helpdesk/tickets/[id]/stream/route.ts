import { NextRequest } from "next/server"
import { verifyRequest } from "@/lib/serverAuth"
import { getRealtimeBus } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/helpdesk/tickets/[id]/stream
 * SSE endpoint for real-time ticket chat updates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SSE (EventSource) doesn't support custom headers, so accept token from query param too
  const url = new URL(request.url)
  const queryToken = url.searchParams.get("token")
  const headerAuth = request.headers.get("authorization")
  const authHeader = headerAuth || (queryToken ? `Bearer ${queryToken}` : null)

  const payload = verifyRequest(authHeader)
  if (!payload) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params
  const ticketId = parseInt(id)
  const channel = `ticket:${ticketId}`

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const bus = getRealtimeBus()

      // Send initial keep-alive
      controller.enqueue(encoder.encode(": connected\n\n"))

      // Subscribe to realtime bus for this ticket
      const unsubscribe = bus.subscribe(channel, (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Stream closed
          unsubscribe()
        }
      })

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch {
          clearInterval(heartbeat)
          unsubscribe()
        }
      }, 30000)

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
