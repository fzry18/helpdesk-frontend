"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  // Check hydration dan localStorage
  useEffect(() => {
    // Cek localStorage langsung untuk token
    const token = localStorage.getItem("access_token")
    setHasToken(!!token)
    setIsHydrated(true)

    console.log('=== Layout Auth Check ===')
    console.log('isAuthenticated (store):', isAuthenticated)
    console.log('hasToken (localStorage):', !!token)
    console.log('isHydrated:', true)
  }, [isAuthenticated])

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
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
