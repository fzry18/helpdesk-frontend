/**
 * Ticket UI Store — Fitur: Tickets
 *
 * State untuk semua elemen UI yang bersifat ephemeral:
 * - Dialog / modal yang terbuka
 * - Ticket yang sedang dipilih / di-preview
 * - State loading per-aksi
 *
 * Pattern: subscribeWithSelector (tanpa persist — UI state tidak perlu disimpan)
 */
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import type { Ticket } from "@/types"

// ─────────────────────────────────────────────────────────────
// Interfaces: State & Actions (terpisah ketat)
// ─────────────────────────────────────────────────────────────

/** Daftar dialog/modal yang dapat dibuka dalam fitur tickets */
export type TicketDialog =
  | "create"
  | "edit"
  | "detail"
  | "confirm-resolution"
  | "reject"
  | "assign"
  | "close"
  | null

export interface TicketUIState {
  /** Dialog/modal yang sedang terbuka. Null jika semuanya tertutup. */
  activeDialog: TicketDialog
  /** Ticket yang sedang dipilih (untuk detail / edit / aksi tertentu). */
  selectedTicket: Ticket | null
  /** ID ticket yang sedang dipilih (untuk lazy-load detail). */
  selectedTicketId: number | null
  /** True selama operasi mutasi (create/update/close) sedang berjalan. */
  isMutating: boolean
  /** True selama proses export data berjalan. */
  isExporting: boolean
  /**
   * Mode tampilan daftar tiket.
   * "table" = tabel standar, "kanban" = board kartu per stage.
   */
  viewMode: "table" | "kanban"
  /**
   * Pesan error terakhir dari operasi mutasi.
   * Null jika tidak ada error.
   */
  mutationError: string | null
}

export interface TicketUIActions {
  /**
   * Buka dialog tertentu, opsional dengan ticket yang bersangkutan.
   * Menutup dialog lain yang mungkin sedang terbuka.
   */
  openDialog: (dialog: NonNullable<TicketDialog>, ticket?: Ticket) => void
  /** Tutup dialog yang aktif dan clear selectedTicket. */
  closeDialog: () => void
  /** Set ticket yang dipilih tanpa membuka dialog (mis. untuk sidebar preview). */
  setSelectedTicket: (ticket: Ticket | null) => void
  /** Set hanya ID ticket (untuk fetch lazy). */
  setSelectedTicketId: (id: number | null) => void
  /** Set status mutasi (saat API call create/update/close berjalan). */
  setMutating: (isMutating: boolean) => void
  /** Set status export. */
  setExporting: (isExporting: boolean) => void
  /** Set pesan error mutasi. */
  setMutationError: (error: string | null) => void
  /** Toggle view mode antara "table" dan "kanban". */
  toggleViewMode: () => void
  /** Set view mode secara eksplisit. */
  setViewMode: (mode: "table" | "kanban") => void
  /** Reset semua UI state ke nilai awal. */
  resetUI: () => void
}

export type TicketUIStore = TicketUIState & TicketUIActions

// ─────────────────────────────────────────────────────────────
// Default / initial state
// ─────────────────────────────────────────────────────────────

const DEFAULT_UI_STATE: TicketUIState = {
  activeDialog: null,
  selectedTicket: null,
  selectedTicketId: null,
  isMutating: false,
  isExporting: false,
  viewMode: "table",
  mutationError: null,
}

// ─────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────

export const selectActiveDialog = (s: TicketUIStore) => s.activeDialog
export const selectSelectedTicket = (s: TicketUIStore) => s.selectedTicket
export const selectSelectedTicketId = (s: TicketUIStore) => s.selectedTicketId
export const selectIsMutating = (s: TicketUIStore) => s.isMutating
export const selectIsExporting = (s: TicketUIStore) => s.isExporting
export const selectViewMode = (s: TicketUIStore) => s.viewMode
export const selectMutationError = (s: TicketUIStore) => s.mutationError

/** True jika dialog `create` sedang terbuka */
export const selectIsCreateDialogOpen = (s: TicketUIStore) =>
  s.activeDialog === "create"
/** True jika dialog `detail` atau `edit` sedang terbuka */
export const selectIsDetailOpen = (s: TicketUIStore) =>
  s.activeDialog === "detail" || s.activeDialog === "edit"

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useTicketUIStore = create<TicketUIStore>()(
  subscribeWithSelector(
    immer<TicketUIStore>((set) => ({
      // ── Initial State ──────────────────────────────────────
      ...DEFAULT_UI_STATE,

      // ── Actions ───────────────────────────────────────────
      openDialog: (dialog, ticket) =>
        set((state) => {
          state.activeDialog = dialog
          if (ticket !== undefined) {
            state.selectedTicket = ticket
            state.selectedTicketId = ticket.id
          }
          state.mutationError = null
        }),

      closeDialog: () =>
        set((state) => {
          state.activeDialog = null
          state.selectedTicket = null
          state.selectedTicketId = null
          state.isMutating = false
          state.mutationError = null
        }),

      setSelectedTicket: (ticket) =>
        set((state) => {
          state.selectedTicket = ticket
          state.selectedTicketId = ticket?.id ?? null
        }),

      setSelectedTicketId: (id) =>
        set((state) => {
          state.selectedTicketId = id
          // Hanya clear selectedTicket jika ID berbeda
          if (state.selectedTicket && state.selectedTicket.id !== id) {
            state.selectedTicket = null
          }
        }),

      setMutating: (isMutating) =>
        set((state) => {
          state.isMutating = isMutating
          if (isMutating) state.mutationError = null
        }),

      setExporting: (isExporting) =>
        set((state) => {
          state.isExporting = isExporting
        }),

      setMutationError: (error) =>
        set((state) => {
          state.mutationError = error
          state.isMutating = false
        }),

      toggleViewMode: () =>
        set((state) => {
          state.viewMode = state.viewMode === "table" ? "kanban" : "table"
        }),

      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode
        }),

      resetUI: () => set(() => ({ ...DEFAULT_UI_STATE })),
    }))
  )
)
