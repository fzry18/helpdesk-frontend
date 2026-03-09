"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Ticket,
  LogOut,
  User,
  Menu,
  X,
  ShieldCheck,
  Users,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
  },
]

const adminMenuItems = [
  {
    title: "Kelola Admin",
    href: "/admin/employees",
    icon: ShieldCheck,
  },
  {
    title: "Kelola Tim",
    href: "/admin/teams",
    icon: Users,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { employee, logout, getDepartment, getJobTitle } = useAuthStore()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Gunakan employee saja (bukan user)
  const displayName = employee?.name || 'User'
  const displayDepartment = getDepartment()
  const displayJobTitle = getJobTitle()
  const showAdminMenu = employee?.helpdesk_role === 'super_admin'

  const handleLogout = () => {
    logout()
    toast({
      title: "Logout berhasil",
      description: "Anda telah keluar dari sistem",
    })
    router.push("/login")
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-14 md:h-16 items-center justify-between border-b px-4 md:px-6">
        <h1 className="text-lg md:text-xl font-bold">Helpdesk System</h1>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            )
          })}

          {/* Admin menu - Super Admin only */}
          {showAdminMenu && (
            <>
              <div className="my-3 border-t" />
              <p className="px-3 pb-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Admin
              </p>
              {adminMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                )
              })}
            </>
          )}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {displayDepartment || displayJobTitle || `NIK: ${employee?.nik || ''}`}
            </p>
            <span
              className={cn(
                "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
                "bg-primary/15 text-primary"
              )}
            >
              {employee?.helpdesk_role === 'super_admin' ? 'Super Admin' : employee?.helpdesk_role === 'dept_admin' ? 'Dept Admin' : 'User'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button - Fixed position */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden bg-background shadow-md"
        onClick={() => setIsMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-card transition-transform duration-200 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <SidebarContent />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen w-64 flex-col border-r bg-card">
        <SidebarContent />
      </div>
    </>
  )
}

