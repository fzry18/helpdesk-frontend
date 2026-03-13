/**
 * src/components/helpdesk/tickets/index.ts
 *
 * Barrel re-exports untuk kompatibilitas import lama.
 * Gunakan "@/features/tickets/components" untuk komponen baru.
 */

export { TicketCard } from "./TicketCard"
export { TicketList } from "./TicketList"
export { TicketFilters, type TicketFilterValues } from "./TicketFilters"
export { TicketAdminActions } from "./TicketAdminActions"
export { AttachmentList } from "./AttachmentList"

// detail sub-components
export { TicketHeader } from "./detail/TicketHeader"
export { TicketDescription, TicketOdooContext } from "./detail/TicketDescription"
export { TicketMetadata } from "./detail/TicketMetadata"
export { MessageThread } from "./detail/MessageThread"
export { MessageForm, type MessageFormData, type MessageFormRef } from "./detail/MessageForm"
export { MessageItem, type MessageItemData } from "./detail/MessageItem"
export { ActivityLogCard } from "./detail/ActivityLogCard"
export { ConfirmationBanner } from "./detail/ConfirmationBanner"

// create sub-components
export { CreateTicketDialog } from "./create/CreateTicketDialog"
export { TicketCategoryTypeSelector } from "./create/TicketCategoryTypeSelector"
export { HelperCategoryForm } from "./create/HelperCategoryForm"
export { SystemCategoryForm } from "./create/SystemCategoryForm"
export { AttachmentUploader } from "./create/AttachmentUploader"
