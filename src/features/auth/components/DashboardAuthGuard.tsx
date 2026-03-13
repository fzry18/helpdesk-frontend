"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useAuthStore } from "@/features/auth/stores/auth.store"
import { authService } from "@/features/auth/services/auth.service"
import { useToast } from "@/hooks/use-toast"

interface DashboardAuthGuardProps {
  children: React.ReactNode
}

export function DashboardAuthGuard({ children }: DashboardAuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const { toast } = useToast()

  const handleSessionExpired = useCallback(() => {
    logout()
    toast({
      title: "Sesi berakhir",
      description: "Sesi login Anda telah habis. Silakan login kembali.",
      variant: "destructive",
    })
    router.push("/login")
  }, [logout, toast, router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    setHasToken(!!token)
    setIsHydrated(true)
  }, [isAuthenticated])

  useEffect(() => {
    if (isHydrated && !isAuthenticated && !hasToken) {
      router.push("/login")
    }
  }, [isHydrated, isAuthenticated, hasToken, router])

  // Listen for auth-error events dispatched by axios interceptor on 401
  useEffect(() => {
    const onAuthError = () => handleSessionExpired()
    window.addEventListener("auth-error", onAuthError)
    return () => window.removeEventListener("auth-error", onAuthError)
  }, [handleSessionExpired])

  // Re-validate session from server on load
  useEffect(() => {
    if (!isHydrated || !hasToken || typeof window === "undefined") return
    const token = localStorage.getItem("access_token") ?? useAuthStore.getState().accessToken
    if (!token) return
    authService
      .me()
      .then((res) => {
        const employee = res.data
        if (employee) {
          useAuthStore.getState().setAuth({ employee, accessToken: token })
        }
      })
      .catch(() => {
        handleSessionExpired()
      })
  }, [isHydrated, hasToken, handleSessionExpired])

  if (!isHydrated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !hasToken) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Mengalihkan ke login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
