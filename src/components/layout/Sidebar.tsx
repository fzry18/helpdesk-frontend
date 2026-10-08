"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import {
  LayoutDashboard,
  Ticket,
  Users,
  LogOut,
  User,
  ShieldCheck,
  Database,
  Activity,
  X,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

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
    title: "User & Role RBAC",
    href: "/admin/users",
    icon: ShieldCheck,
  },
  {
    title: "Master Data",
    href: "/admin/master-data",
    icon: Database,
  },
  {
    title: "Audit Log",
    href: "/admin/audit-logs",
    icon: Activity,
  },
]

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { employee, logout, getDepartment, getJobTitle, isManager, hasRole } = useAuthStore()
  const router = useRouter()

  const displayName = employee?.name || "User"
  const displayDepartment = getDepartment()
  const displayJobTitle = getJobTitle()

  const roles = employee?.roles || []
  const isSuperAdmin = roles.includes("SUPER_ADMIN") || hasRole("SUPER_ADMIN")
  const isAdminUser =
    isManager() ||
    isSuperAdmin ||
    roles.includes("ADMIN_IT_SUPPORT")

  const roleBadge = isSuperAdmin
    ? { label: "Super Admin", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800" }
    : roles.includes("ADMIN_IT_SUPPORT")
    ? { label: "Admin IT Support", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800" }
    : roles.includes("IT_SUPPORT")
    ? { label: "IT Support", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" }
    : { label: "User", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" }

  const handleLogout = () => {
    logout()
    toast({
      title: "Logout berhasil",
      description: "Anda telah keluar dari sistem",
    })
    router.push("/login")
  }

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  const renderNavContent = () => (
    <>
      <div className="flex h-16 items-center justify-between border-b px-6">
        <h1 className="text-xl font-bold tracking-tight">Helpdesk System</h1>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden h-8 w-8"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menu Utama
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.title}
              </Link>
            )
          })}

          {isAdminUser && (
            <div className="pt-4 space-y-1">
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fitur Admin
              </p>
              {adminMenuItems
                .filter((item) => item.href !== "/admin/users" || isSuperAdmin)
                .map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.title}
                    </Link>
                  )
                })}
            </div>
          )}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {displayDepartment || displayJobTitle || `NIK: ${employee?.nik || employee?.helpdesk_username || ""}`}
            </p>
            <span className={cn("mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border", roleBadge.color)}>
              {roleBadge.label}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10"
          onClick={() => {
            onClose?.()
            handleLogout()
          }}
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card shrink-0">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer (Slide-over overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card shadow-2xl transition-transform duration-300">
            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  )
}


