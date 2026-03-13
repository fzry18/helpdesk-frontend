/**
 * Ticket Filter Store — Fitur: Tickets
 *
 * State untuk semua filter, sorting, dan pagination daftar tiket.
 * Dipisah dari ticket-ui.store.ts agar concern filter murni (tidak ada
 * state dialog/modal di sini).
 *
 * Pattern: subscribeWithSelector (tanpa persist — filter tidak perlu disimpan)
 */
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

// ─────────────────────────────────────────────────────────────
// Interfaces: State & Actions (terpisah ketat)
// ─────────────────────────────────────────────────────────────

export type SortOrder = "asc" | "desc"

export interface TicketFilterState {
  /** Filter: stage/status nama (mis. "In Progress", "Resolved") */
  status: string | null
  /** Filter: priority string dari Odoo ("0"–"4") */
  priority: string | null
  /** Filter: team ID */
  teamId: number | null
  /** Filter: category ID */
  categoryId: number | null
  /** Filter: search query (subject / ticket number) */
  search: string
  /** Filter: kategori ticket ("helper" | "system" | null untuk semua) */
  ticketCategoryType: "helper" | "system" | null
  /** Sorting: nama field yang digunakan untuk sort */
  sortBy: string
  /** Sorting: arah sort */
  sortOrder: SortOrder
  /** Pagination: halaman aktif (1-based) */
  page: number
  /** Pagination: jumlah item per halaman */
  pageSize: number
  /** Filter: date range — start */
  dateFrom: string | null
  /** Filter: date range — end */
  dateTo: string | null
}

export interface TicketFilterActions {
  /** Set filter status/stage */
  setStatus: (status: string | null) => void
  /** Set filter priority */
  setPriority: (priority: string | null) => void
  /** Set filter team */
  setTeamId: (teamId: number | null) => void
  /** Set filter category */
  setCategoryId: (categoryId: number | null) => void
  /** Set search query; otomatis reset page ke 1 */
  setSearch: (search: string) => void
  /** Set filter kategori ticket */
  setTicketCategoryType: (type: "helper" | "system" | null) => void
  /** Set sorting — reset page ke 1 */
  setSortBy: (sortBy: string, order?: SortOrder) => void
  /** Set halaman aktif */
  setPage: (page: number) => void
  /** Set jumlah item per halaman; reset page ke 1 */
  setPageSize: (pageSize: number) => void
  /** Set date range filter */
  setDateRange: (from: string | null, to: string | null) => void
  /**
   * Reset SEMUA filter ke nilai awal.
   * Berguna untuk tombol "Reset Filter".
   */
  resetFilters: () => void
  /**
   * Set banyak filter sekaligus (batch update).
   * Cocok untuk prefill filter dari URL query params.
   */
  applyFilters: (partial: Partial<TicketFilterState>) => void
}

export type TicketFilterStore = TicketFilterState & TicketFilterActions

// ─────────────────────────────────────────────────────────────
// Default / initial state (dapat di-reuse oleh resetFilters)
// ─────────────────────────────────────────────────────────────

const DEFAULT_FILTER_STATE: TicketFilterState = {
  status: null,
  priority: null,
  teamId: null,
  categoryId: null,
  search: "",
  ticketCategoryType: null,
  sortBy: "create_date",
  sortOrder: "desc",
  page: 1,
  pageSize: 20,
  dateFrom: null,
  dateTo: null,
}

// ─────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────

export const selectTicketFilters = (s: TicketFilterStore): TicketFilterState => ({
  status: s.status,
  priority: s.priority,
  teamId: s.teamId,
  categoryId: s.categoryId,
  search: s.search,
  ticketCategoryType: s.ticketCategoryType,
  sortBy: s.sortBy,
  sortOrder: s.sortOrder,
  page: s.page,
  pageSize: s.pageSize,
  dateFrom: s.dateFrom,
  dateTo: s.dateTo,
})

export const selectActiveFilterCount = (s: TicketFilterStore): number => {
  let count = 0
  if (s.status !== null) count++
  if (s.priority !== null) count++
  if (s.teamId !== null) count++
  if (s.categoryId !== null) count++
  if (s.search.trim() !== "") count++
  if (s.ticketCategoryType !== null) count++
  if (s.dateFrom !== null || s.dateTo !== null) count++
  return count
}

export const selectHasActiveFilters = (s: TicketFilterStore): boolean =>
  selectActiveFilterCount(s) > 0

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useTicketFilterStore = create<TicketFilterStore>()(
  subscribeWithSelector(
    immer<TicketFilterStore>((set) => ({
      // ── Initial State ──────────────────────────────────────
      ...DEFAULT_FILTER_STATE,

      // ── Actions ───────────────────────────────────────────
      setStatus: (status) =>
        set((state) => {
          state.status = status
          state.page = 1
        }),

      setPriority: (priority) =>
        set((state) => {
          state.priority = priority
          state.page = 1
        }),

      setTeamId: (teamId) =>
        set((state) => {
          state.teamId = teamId
          state.page = 1
        }),

      setCategoryId: (categoryId) =>
        set((state) => {
          state.categoryId = categoryId
          state.page = 1
        }),

      setSearch: (search) =>
        set((state) => {
          state.search = search
          state.page = 1
        }),

      setTicketCategoryType: (type) =>
        set((state) => {
          state.ticketCategoryType = type
          state.page = 1
        }),

      setSortBy: (sortBy, order) =>
        set((state) => {
          state.sortBy = sortBy
          if (order) state.sortOrder = order
          state.page = 1
        }),

      setPage: (page) =>
        set((state) => {
          state.page = page
        }),

      setPageSize: (pageSize) =>
        set((state) => {
          state.pageSize = pageSize
          state.page = 1
        }),

      setDateRange: (from, to) =>
        set((state) => {
          state.dateFrom = from
          state.dateTo = to
          state.page = 1
        }),

      resetFilters: () => set(() => ({ ...DEFAULT_FILTER_STATE })),

      applyFilters: (partial) =>
        set((state) => {
          Object.assign(state, partial)
          // Reset page bila filter berubah (kecuali page di-set eksplisit)
          if (!("page" in partial)) {
            state.page = 1
          }
        }),
    }))
  )
)
