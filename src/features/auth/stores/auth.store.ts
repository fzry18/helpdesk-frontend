/**
 * Auth Store — Fitur: Autentikasi
 *
 * Store terpusat untuk state autentikasi user. Migrasi dari src/store/authStore.ts
 * ke lokasi fitur yang sesuai dengan arsitektur baru.
 *
 * @remarks
 * File src/store/authStore.ts tetap ada (tidak dihapus).
 * Komponen yang masih menggunakannya akan dimigrasikan bertahap di step selanjutnya.
 *
 * Pattern: subscribeWithSelector + persist + immer
 * (mengikuti zustand-store-ts skill — state/actions terpisah ketat)
 */
import { create } from "zustand"
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import type { Employee } from "@/types"
import type { HelpdeskRole } from "@/lib/constants/roles"
import { HELPDESK_ROLES, isAdminRole } from "@/lib/constants/roles"
import { destroySocket } from "@/lib/socket/client"

// ─────────────────────────────────────────────────────────────
// Interfaces: State & Actions (terpisah ketat)
// ─────────────────────────────────────────────────────────────

export interface AuthState {
  /** Data employee yang sedang login. Null jika belum login. */
  employee: Employee | null
  /** JWT access token yang disimpan ke localStorage. */
  accessToken: string | null
  /** True jika user sudah terautentikasi. */
  isAuthenticated: boolean
  /** True selama proses login/logout sedang berjalan. */
  isLoading: boolean
}

export interface AuthActions {
  /**
   * Set state autentikasi setelah login berhasil.
   * Menyimpan access token ke localStorage.
   */
  setAuth: (params: { employee: Employee; accessToken: string }) => void
  /** Set status loading (saat API call berjalan). */
  setLoading: (loading: boolean) => void
  /**
   * Hapus semua state auth dan bersihkan localStorage.
   * Juga memutus koneksi Socket.io.
   */
  logout: () => void

  // ── Derived getters (computed dari state) ──────────────────
  /** Nama lengkap employee atau fallback "User". */
  getDisplayName: () => string
  /** NIK employee atau string kosong. */
  getDisplayIdentifier: () => string
  /** Nama departemen atau string kosong. */
  getDepartment: () => string
  /** Judul jabatan atau string kosong. */
  getJobTitle: () => string
  /** True jika employee adalah manajer. */
  isManager: () => boolean
  /** Role helpdesk employee, default 'user'. */
  getHelpdeskRole: () => HelpdeskRole
  /** True jika role = dept_admin atau super_admin. */
  isAdmin: () => boolean
  /** True jika role = super_admin. */
  isSuperAdmin: () => boolean
}

export type AuthStore = AuthState & AuthActions

// ─────────────────────────────────────────────────────────────
// Selectors (untuk meminimalkan re-render dengan selector granular)
// ─────────────────────────────────────────────────────────────

export const selectEmployee = (s: AuthStore) => s.employee
export const selectIsAuthenticated = (s: AuthStore) => s.isAuthenticated
export const selectIsLoading = (s: AuthStore) => s.isLoading
export const selectAccessToken = (s: AuthStore) => s.accessToken
export const selectEmployeeName = (s: AuthStore) => s.employee?.name ?? ""
export const selectEmployeeNik = (s: AuthStore) => s.employee?.nik ?? ""
export const selectEmployeeDepartment = (s: AuthStore) => s.employee?.department ?? ""
export const selectHelpdeskRole = (s: AuthStore): HelpdeskRole =>
  s.employee?.helpdesk_role ?? HELPDESK_ROLES.USER
export const selectIsAdmin = (s: AuthStore) =>
  isAdminRole(selectHelpdeskRole(s))
export const selectIsSuperAdmin = (s: AuthStore) =>
  selectHelpdeskRole(s) === HELPDESK_ROLES.SUPER_ADMIN

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      immer<AuthStore>((set, get) => ({
        // ── Initial State ──────────────────────────────────────
        employee: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,

        // ── Actions ───────────────────────────────────────────
        setAuth: ({ employee, accessToken }) => {
          if (typeof window !== "undefined") {
            localStorage.setItem("access_token", accessToken)
            document.cookie = `access_token=${encodeURIComponent(accessToken)}; path=/; samesite=lax`
          }
          set((state) => {
            state.employee = employee
            state.accessToken = accessToken
            state.isAuthenticated = true
            state.isLoading = false
          })
        },

        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading
          })
        },

        logout: () => {
          if (typeof window !== "undefined") {
            localStorage.removeItem("access_token")
            document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax"
          }
          destroySocket()
          set((state) => {
            state.employee = null
            state.accessToken = null
            state.isAuthenticated = false
            state.isLoading = false
          })
        },

        // ── Derived getters ───────────────────────────────────
        getDisplayName: () => get().employee?.name ?? "User",
        getDisplayIdentifier: () => get().employee?.nik ?? "",
        getDepartment: () => get().employee?.department ?? "",
        getJobTitle: () => get().employee?.job_title ?? "",
        isManager: () => get().employee?.is_manager ?? false,
        getHelpdeskRole: () =>
          get().employee?.helpdesk_role ?? HELPDESK_ROLES.USER,
        isAdmin: () => isAdminRole(get().employee?.helpdesk_role ?? null),
        isSuperAdmin: () =>
          get().employee?.helpdesk_role === HELPDESK_ROLES.SUPER_ADMIN,
      })),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
        /** Hanya persist state yang diperlukan; actions tidak perlu disimpan. */
        partialize: (state) => ({
          employee: state.employee,
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
)
