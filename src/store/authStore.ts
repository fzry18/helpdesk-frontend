import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { subscribeWithSelector } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import type { Employee } from "@/types"

interface AuthState {
  employee: Employee | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setAuth: (params: {
    employee: Employee
    accessToken: string
  }) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  getDisplayName: () => string
  getDisplayIdentifier: () => string
  getDepartment: () => string
  getJobTitle: () => string
  isManager: () => boolean
  getHelpdeskRole: () => 'user' | 'dept_admin' | 'super_admin'
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
}

type AuthStore = AuthState & AuthActions

// Selectors untuk optimasi re-render
export const selectEmployee = (state: AuthStore) => state.employee
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated
export const selectIsLoading = (state: AuthStore) => state.isLoading
export const selectAccessToken = (state: AuthStore) => state.accessToken
export const selectEmployeeName = (state: AuthStore) => state.employee?.name || ''
export const selectEmployeeDepartment = (state: AuthStore) => state.employee?.department || ''
export const selectHelpdeskRole = (state: AuthStore) => {
  const employee = state.employee
  if (!employee) return 'user'
  if (employee.helpdesk_role === 'super_admin') return 'super_admin'
  if (employee.helpdesk_role === 'dept_admin') return 'dept_admin'
  return 'user'
}
export const selectIsAdmin = (state: AuthStore) => {
  const role = selectHelpdeskRole(state)
  return role === 'dept_admin' || role === 'super_admin'
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
      employee: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: ({ employee, accessToken }) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken)
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
        }
        set((state) => {
          state.employee = null
          state.accessToken = null
          state.isAuthenticated = false
          state.isLoading = false
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
        return state.employee?.is_manager ?? false
      },
      getHelpdeskRole: () => {
        const state = get()
        return state.employee?.helpdesk_role || 'user'
      },
      isAdmin: () => {
        const state = get()
        const role = state.employee?.helpdesk_role
        return role === 'dept_admin' || role === 'super_admin'
      },
      isSuperAdmin: () => {
        const state = get()
        return state.employee?.helpdesk_role === 'super_admin'
      },
    })),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        employee: state.employee,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
    )
  )
)

