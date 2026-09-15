import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Employee } from "@/types"

interface AuthState {
  employee: Employee | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (params: {
    employee: Employee
    accessToken: string
  }) => void
  // Helper untuk mendapatkan display name
  getDisplayName: () => string
  // Helper untuk mendapatkan NIK
  getDisplayIdentifier: () => string
  // Helper untuk mendapatkan department
  getDepartment: () => string
  // Helper untuk mendapatkan job title
  getJobTitle: () => string
  // Helper untuk cek apakah manager (ADMIN_IT_SUPPORT atau SUPER_ADMIN)
  isManager: () => boolean
  // Helper untuk cek role
  hasRole: (role: string) => boolean
  // Helper untuk cek permission
  hasPermission: (permission: string) => boolean
  // Get all roles
  getRoles: () => string[]
  // Get all permissions
  getPermissions: () => string[]
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      employee: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: ({ employee, accessToken }) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken)
        }
        set({
          employee,
          accessToken,
          isAuthenticated: true,
        })
      },
      getDisplayName: () => {
        const state = get()
        return state.employee?.name || 'User'
      },
      getDisplayIdentifier: () => {
        const state = get()
        return state.employee?.nik || ''
      },
      getDepartment: () => {
        const state = get()
        return state.employee?.department || ''
      },
      getJobTitle: () => {
        const state = get()
        return state.employee?.job_title || ''
      },
      isManager: () => {
        const state = get()
        const roles = state.employee?.roles || []
        return (
          state.employee?.is_manager === true ||
          roles.includes("SUPER_ADMIN") ||
          roles.includes("ADMIN_IT_SUPPORT")
        )
      },
      hasRole: (role: string) => {
        const state = get()
        const roles = state.employee?.roles || []
        return roles.includes(role)
      },
      hasPermission: (permission: string) => {
        const state = get()
        const perms = state.employee?.permissions || []
        // Super admin has all permissions
        if (state.employee?.roles?.includes("SUPER_ADMIN")) return true
        return perms.includes(permission)
      },
      getRoles: () => {
        const state = get()
        return state.employee?.roles || []
      },
      getPermissions: () => {
        const state = get()
        return state.employee?.permissions || []
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
        }
        set({
          employee: null,
          accessToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: "auth-storage",
    }
  )
)
