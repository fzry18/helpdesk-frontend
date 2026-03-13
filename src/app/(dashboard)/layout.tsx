"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { authAPI } from "@/lib/api/endpoints"
import { useToast } from "@/hooks/use-toast"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    authAPI
      .me()
      .then((res) => {
        const employee = res.data
        if (employee) {
          useAuthStore.getState().setAuth({ employee, accessToken: token })
        }
      })
      .catch(() => {
        // Token invalid / expired → force logout
        handleSessionExpired()
      })
  }, [isHydrated, hasToken, handleSessionExpired])

  // Loading state saat belum hydrated
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  // Jika sudah hydrated tapi belum auth, tampilkan loading (sambil redirect)
  if (!isAuthenticated && !hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Mengalihkan ke login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pt-14 md:pt-4 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
