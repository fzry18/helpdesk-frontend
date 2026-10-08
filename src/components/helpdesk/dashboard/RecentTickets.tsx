"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketCard } from "@/components/helpdesk/tickets/TicketCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowRight, Ticket as TicketIcon, Inbox, Filter } from "lucide-react"
import Link from "next/link"
import type { Ticket } from "@/types"

interface RecentTicketsProps {
  tickets: Ticket[] | null
  isLoading: boolean
}

type FilterTab = "all" | "action_needed" | "in_progress" | "closed"

export function RecentTickets({ tickets, isLoading }: RecentTicketsProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all")

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-primary" />
            Daftar Tiket Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const allTickets = tickets || []

  // Pre-calculate counts for tabs
  const actionNeededCount = allTickets.filter(
    (t) =>
      t.status !== "closed" &&
      !t.resolution_confirmed &&
      !t.stage?.name?.toLowerCase().includes("closed") &&
      !t.assigned_user?.name &&
      !t.assigned_user_name
  ).length

  const inProgressCount = allTickets.filter(
    (t) =>
      t.status !== "closed" &&
      !t.resolution_confirmed &&
      !t.stage?.name?.toLowerCase().includes("closed") &&
      (Boolean(t.assigned_user?.name) || Boolean(t.assigned_user_name))
  ).length

  const closedCount = allTickets.filter(
    (t) =>
      t.status === "closed" ||
      t.resolution_confirmed ||
      t.stage?.name?.toLowerCase().includes("closed") ||
      t.stage?.name?.toLowerCase().includes("selesai")
  ).length

  // Filter tickets based on active tab
  const filteredTickets = allTickets.filter((t) => {
    const isClosed =
      t.status === "closed" ||
      t.resolution_confirmed ||
      t.stage?.name?.toLowerCase().includes("closed") ||
      t.stage?.name?.toLowerCase().includes("selesai")

    const isUnassigned =
      !t.assigned_user?.name && !t.assigned_user_name && !isClosed

    if (activeTab === "action_needed") return isUnassigned
    if (activeTab === "in_progress") return !isClosed && !isUnassigned
    if (activeTab === "closed") return isClosed
    return true
  })

  return (
    <Card className="border-border/60 shadow-sm w-full">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-primary" />
            Daftar Tiket Terbaru
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ringkasan tiket yang baru diperbarui dan membutuhkan penanganan
          </p>
        </div>

        <Link href="/tickets">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8">
            Lihat Semua Tiket
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              activeTab === "all"
                ? "bg-white dark:bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({allTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("action_needed")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              activeTab === "action_needed"
                ? "bg-white dark:bg-card text-rose-700 dark:text-rose-300 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Perlu Tindakan ({actionNeededCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("in_progress")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              activeTab === "in_progress"
                ? "bg-white dark:bg-card text-sky-700 dark:text-sky-300 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sedang Diproses ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("closed")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              activeTab === "closed"
                ? "bg-white dark:bg-card text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Selesai ({closedCount})
          </button>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="py-10 text-center space-y-2 border rounded-xl bg-muted/20">
            <Inbox className="h-8 w-8 text-muted-foreground/60 mx-auto" />
            <p className="text-xs font-medium text-foreground">
              Tidak ada tiket pada kategori ini
            </p>
            <p className="text-xs text-muted-foreground">
              {activeTab === "all"
                ? "Belum ada tiket yang terdaftar."
                : "Semua tiket sudah berpindah status atau tertangani."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
