"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  FileCheck2,
} from "lucide-react"

interface DashboardStatsProps {
  stats: {
    summary: {
      total: number
      open: number
      closed: number
      unassigned: number
      waiting_confirmation?: number
      in_progress?: number
    }
    period?: {
      today: number
      this_week: number
      this_month: number
    }
  } | null
  isAdmin?: boolean
  isLoading: boolean
}

export function DashboardStats({
  stats,
  isAdmin = true,
  isLoading,
}: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    )
  }

  const summary = stats?.summary || {
    total: 0,
    open: 0,
    closed: 0,
    unassigned: 0,
    waiting_confirmation: 0,
    in_progress: 0,
  }

  const period = stats?.period || {
    today: 0,
    this_week: 0,
    this_month: 0,
  }

  if (!isAdmin) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tiket Saya</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{summary.total}</h3>
              <p className="text-xs text-muted-foreground">Semua tiket yang Anda buat</p>
            </div>
            <div className="rounded-xl p-3 bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40">
              <Ticket className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sedang Diproses</p>
              <h3 className="text-2xl font-bold tracking-tight text-amber-800 dark:text-amber-300">
                {summary.in_progress || summary.open}
              </h3>
              <p className="text-xs text-muted-foreground">Dalam penanganan tim IT</p>
            </div>
            <div className="rounded-xl p-3 bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menunggu Konfirmasi</p>
              <h3 className="text-2xl font-bold tracking-tight text-purple-800 dark:text-purple-300">
                {summary.waiting_confirmation || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Perlu verifikasi penyelesaian</p>
            </div>
            <div className="rounded-xl p-3 bg-purple-50 text-purple-800 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40">
              <FileCheck2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiket Selesai</p>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">{summary.closed}</h3>
              <p className="text-xs text-muted-foreground">Kendala telah terselesaikan</p>
            </div>
            <div className="rounded-xl p-3 bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tiket Masuk</p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{summary.total}</h3>
            <p className="text-xs text-muted-foreground">
              {period.this_month} tiket bulan ini
            </p>
          </div>
          <div className="rounded-xl p-3 bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40">
            <Ticket className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiket Terbuka / Aktif</p>
            <h3 className="text-2xl font-bold tracking-tight text-amber-800 dark:text-amber-300">
              {summary.open}
            </h3>
            <p className="text-xs text-muted-foreground">
              {summary.open > 0 ? "Memerlukan penanganan" : "Tidak ada tiket aktif"}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
            <AlertCircle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Belum Ditugaskan</p>
            <h3 className="text-2xl font-bold tracking-tight text-rose-800 dark:text-rose-300">
              {summary.unassigned}
            </h3>
            <p className="text-xs text-muted-foreground">
              {summary.unassigned > 0 ? "Perlu alokasi teknisi" : "Semua sudah ada teknisi"}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-rose-50 text-rose-800 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40">
            <UserX className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-xs hover:shadow-sm transition-all bg-card">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiket Selesai</p>
            <h3 className="text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
              {summary.closed}
            </h3>
            <p className="text-xs text-muted-foreground">
              {period.today} tiket ditutup hari ini
            </p>
          </div>
          <div className="rounded-xl p-3 bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

