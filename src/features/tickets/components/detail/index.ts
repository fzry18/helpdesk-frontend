/**
 * src/features/tickets/components/detail/index.ts
 *
 * Re-exports komponen detail tiket.
 * Komponen berada di src/components/helpdesk/tickets/detail/ (legacy path)
 * dan di-re-export dari sini untuk path baru @/features/tickets/components/detail.
 */

export { TicketHeader } from "@/components/helpdesk/tickets/detail/TicketHeader"
export {
  TicketDescription,
  TicketOdooContext,
} from "@/components/helpdesk/tickets/detail/TicketDescription"
export { TicketMetadata } from "@/components/helpdesk/tickets/detail/TicketMetadata"
export { MessageThread } from "@/components/helpdesk/tickets/detail/MessageThread"
export {
  MessageForm,
  type MessageFormData,
  type MessageFormRef,
} from "@/components/helpdesk/tickets/detail/MessageForm"
export {
  MessageItem,
  type MessageItemData,
} from "@/components/helpdesk/tickets/detail/MessageItem"
export { ActivityLogCard } from "@/components/helpdesk/tickets/detail/ActivityLogCard"
export { ConfirmationBanner } from "@/components/helpdesk/tickets/detail/ConfirmationBanner"
