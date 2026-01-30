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
  // Helper untuk cek apakah manager
  isManager: () => boolean
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
        if (state.employee?.helpdesk_username) {
          return `NIK: ...${state.employee.helpdesk_username}`
        }
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
        return state.employee?.is_manager ?? false
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token")
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

