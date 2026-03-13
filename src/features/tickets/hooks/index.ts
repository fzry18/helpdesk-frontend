/**
 * src/features/tickets/hooks/index.ts
 *
 * Barrel exports untuk semua hooks fitur tickets.
 */

export {
  useTicketList,
  useInfiniteTicketList,
  usePrefetchTicket,
} from "./use-ticket-list"

export {
  useTicketDetail,
  useTicketThread,
} from "./use-ticket-detail"

export {
  useCreateTicket,
  useUpdateTicket,
  useUpdateTicketStage,
  useOpenTicket,
  useCloseTicket,
  useRequestConfirmation,
  useConfirmResolved,
  useRejectTicket,
  useSetPriority,
  usePostMessage,
} from "./use-ticket-mutations"

export {
  useAssignToMe,
  useAssignEmployee,
  useAssignTeam,
} from "./use-ticket-assignments"
