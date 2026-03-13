import { useAuthStore } from "@/features/auth/stores/auth.store"

export function useAuth() {
  const employee = useAuthStore((s) => s.employee)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const getHelpdeskRole = useAuthStore((s) => s.getHelpdeskRole)

  return {
    employee,
    isAuthenticated,
    isLoading,
    setAuth,
    logout,
    getHelpdeskRole,
  }
}
