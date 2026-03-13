import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { DashboardAuthGuard } from "@/features/auth/components/DashboardAuthGuard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pt-14 md:pt-4 sm:p-4 md:p-6">
          <DashboardAuthGuard>{children}</DashboardAuthGuard>
        </main>
      </div>
    </div>
  )
}
