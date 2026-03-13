/**
 * src/features/tickets/components/index.ts
 *
 * Barrel exports untuk semua komponen fitur tickets.
 * Import dari "@/features/tickets/components" — bukan path langsung.
 */

export { TicketStatusBadge } from "./TicketStatusBadge"
export { TicketPriorityBadge } from "./TicketPriorityBadge"
export { TicketCard } from "./TicketCard"
export { TicketFilters } from "./TicketFilters"
export { TicketList } from "./TicketList"
export { TicketActions } from "./TicketActions"
export { TicketFormDialog } from "./TicketFormDialog"
export { AttachmentList } from "@/components/helpdesk/tickets/AttachmentList"
export { TicketAdminActions } from "@/components/helpdesk/tickets/TicketAdminActions"
export { TicketList as VirtualTicketList } from "@/components/helpdesk/tickets/TicketList"
