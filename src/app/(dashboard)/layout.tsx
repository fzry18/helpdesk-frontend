"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { authAPI } from "@/lib/api/endpoints"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, setAuth } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Check hydration dan localStorage
  useEffect(() => {
    // Cek localStorage langsung untuk token
    const token = localStorage.getItem("access_token")
    setHasToken(!!token)
    setIsHydrated(true)

    // Auto-sync roles & user profile from backend
    if (token) {
      authAPI
        .me()
        .then((res: any) => {
          const body = res?.data || res
          if (body?.success && body?.data) {
            const { employee, roles, permissions } = body.data
            setAuth({
              employee: {
                ...employee,
                roles: roles || employee?.roles || [],
                permissions: permissions || employee?.permissions || [],
              },
              accessToken: token,
            })
          }
        })
        .catch((err) => {
          console.warn("Auth sync failed:", err)
        })
    }
  }, [setAuth])

  // Redirect hanya setelah hydrated DAN tidak ada token
  useEffect(() => {
    if (isHydrated && !isAuthenticated && !hasToken) {
      console.log('No auth - redirecting to login')
      router.push("/login")
    }
  }, [isHydrated, isAuthenticated, hasToken, router])

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
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

