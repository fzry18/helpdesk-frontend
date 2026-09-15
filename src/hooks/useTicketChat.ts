import { useEffect, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"

interface UseTicketChatOptions {
  ticketId: number
  enabled?: boolean
}

/**
 * Hook for subscribing to real-time ticket chat updates via SSE.
 * Automatically invalidates react-query cache when new messages arrive.
 */
export function useTicketChat({ ticketId, enabled = true }: UseTicketChatOptions) {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!enabled || !ticketId) return

    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // SSE does not support custom headers natively, so pass token as query param
    const url = `/api/helpdesk/tickets/${ticketId}/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        if (payload.type === "new_message") {
          // Invalidate the messages/thread query so React Query refetches
          queryClient.invalidateQueries({
            queryKey: ["ticket", ticketId, "thread"],
          })
        }

        if (payload.type === "status_update") {
          // Invalidate the ticket detail query
          queryClient.invalidateQueries({
            queryKey: ["ticket", ticketId],
          })
        }
      } catch {
        // Ignore non-JSON messages (heartbeats, comments)
      }
    }

    es.onerror = () => {
      // Auto-reconnect is built into EventSource
      // Just log for debugging
      console.warn(`[useTicketChat] SSE error for ticket #${ticketId}, will auto-reconnect`)
    }

    eventSourceRef.current = es
  }, [ticketId, enabled, queryClient])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [connect])

  return {
    reconnect: connect,
  }
}
