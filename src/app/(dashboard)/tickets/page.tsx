"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ticketAPI } from "@/lib/api/endpoints"
import { apiClient } from "@/lib/api/client"
import { useAuthStore } from "@/store/authStore"
import { TicketList } from "@/components/helpdesk/tickets/TicketList"
import { TicketFilters } from "@/components/helpdesk/tickets/TicketFilters"
import { CreateTicketDialog } from "@/components/helpdesk/tickets/CreateTicketDialog"
import { useDebounce } from "@/hooks/use-debounce"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, AlertCircle, Inbox, UserCheck, CheckCircle2, ListFilter, Sparkles, ChevronDown, ChevronUp } from "lucide-react"

export default function TicketsPage() {
  const { isManager, hasRole } = useAuthStore()
  const isStaff =
    isManager() ||
    hasRole("SUPER_ADMIN") ||
    hasRole("ADMIN_IT_SUPPORT") ||
    hasRole("IT_SUPPORT")

  const [activeQueue, setActiveQueue] = useState<string>(isStaff ? "unassigned" : "active")
  const [showWorkload, setShowWorkload] = useState<boolean>(false)

  const [filters, setFilters] = useState<{
    search?: string
    stage_id?: number
    team_id?: number
    priority?: string
    category_id?: number
  }>({})

  const debouncedSearch = useDebounce(filters.search || "", 500)

  // Fetch tickets with activeQueue filter
  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", { ...filters, queue: activeQueue, search: debouncedSearch }],
    queryFn: async () => {
      const response = await ticketAPI.list({
        ...filters,
        queue: activeQueue,
        search: debouncedSearch || undefined,
      } as any)
      return response
    },
  })

  // Fetch technician workload (only for staff)
  const { data: workloadData } = useQuery({
    queryKey: ["technician-workload"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: any[]; meta: any }>(
        "/admin/technician-workload"
      )
      return res.data || []
    },
    enabled: isStaff && showWorkload,
  })

  const counts = (data?.meta as any)?.counts || {}

  // Tab configurations based on user role
  const staffTabs = [
    {
      id: "unassigned",
      label: "Antrian Belum Ditugaskan",
      icon: Inbox,
      count: counts.unassigned,
      badgeColor: "bg-orange-100 text-orange-800",
    },
    {
      id: "my_assigned",
      label: "Ditugaskan ke Saya",
      icon: UserCheck,
      count: counts.my_assigned,
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      id: "waiting_confirmation",
      label: "Menunggu Konfirmasi User",
      icon: CheckCircle2,
      count: counts.waiting_confirmation,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      id: "all",
      label: "Semua Tiket",
      icon: ListFilter,
      count: counts.all,
      badgeColor: "bg-gray-100 text-gray-800",
    },
  ]

  const userTabs = [
    {
      id: "active",
      label: "Tiket Aktif",
      icon: Inbox,
      count: counts.active,
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      id: "closed",
      label: "Riwayat Selesai",
      icon: CheckCircle2,
      count: counts.closed,
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
  ]

  const activeTabs = isStaff ? staffTabs : userTabs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Helpdesk Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStaff
              ? "Pantau antrian, tindaklanjuti laporan, dan kelola penugasan teknisi IT"
              : "Kelola dan pantau progres tiket bantuan IT Anda"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWorkload(!showWorkload)}
              className="gap-1.5 text-xs"
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              Beban Kerja Teknisi
              {showWorkload ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
          <CreateTicketDialog />
        </div>
      </div>

      {/* Technician Workload Card (Expandable for Admin/Staff) */}
      {isStaff && showWorkload && (
        <Card className="border-primary/20 bg-primary/[0.01]">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Ringkasan Beban Kerja Teknisi IT
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Total Tiket Aktif: {(data?.meta as any)?.counts?.all || 0}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.isArray(workloadData) && workloadData.length > 0 ? (
                workloadData.map((tech: any) => (
                  <div
                    key={tech.id}
                    className="p-3 rounded-xl border bg-card text-xs space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="font-semibold text-foreground truncate">{tech.name}</p>
                        <p className="text-[10px] text-muted-foreground">{tech.job_title || "IT Support"}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs px-2 py-0.5 ${
                          tech.active_tickets > 3
                            ? "bg-red-100 text-red-800 font-bold"
                            : tech.active_tickets > 0
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {tech.active_tickets} Aktif
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t text-muted-foreground">
                      <span>Mendesak: <strong className="text-destructive">{tech.urgent_tickets}</strong></span>
                      <span>Menunggu: <strong>{tech.waiting_confirmation_tickets}</strong></span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2">Memuat data beban kerja teknisi...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role-Based Queue Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {activeTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeQueue === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveQueue(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-all ${
                    isActive ? "bg-white/20 text-white" : tab.badgeColor
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filters (Search, Priority, Stage, Category) */}
      <TicketFilters onFilterChange={setFilters} />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h3 className="font-semibold text-destructive mb-1 text-sm">Gagal Memuat Daftar Tiket</h3>
          <p className="text-xs text-muted-foreground">
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              "Terjadi kesalahan saat memuat tiket"}
          </p>
        </div>
      )}

      {/* Tickets List */}
      <TicketList
        tickets={Array.isArray(data?.data) ? (data.data as any) : null}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {data?.meta && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <p>
            Menampilkan halaman {data.meta.page} dari {data.meta.total_pages} ({data.meta.total} tiket)
          </p>
        </div>
      )}
    </div>
  )
}
