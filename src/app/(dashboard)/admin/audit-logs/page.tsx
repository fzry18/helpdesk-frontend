"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { useDebounce } from "@/hooks/use-debounce"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"
import { ShieldAlert, Search, RefreshCw, Smartphone, Laptop, Globe } from "lucide-react"

export default function AuditLogsPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", { page, search: debouncedSearch }],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean
        data: any[]
        meta: { page: number; limit: number; total: number; total_pages: number }
      }>("/admin/audit-logs", {
        params: { page, limit: 20, search: debouncedSearch || undefined },
      })
      return res
    },
  })

  const logs = data?.data || []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-primary" />
            Audit Log Aktivitas Login
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Riwayat pencatatan sesi login pengguna, IP address, dan perangkat ke sistem Helpdesk.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan nama, NIK, atau IP..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Log Table Card */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold">Daftar Riwayat Login</CardTitle>
          <CardDescription className="text-xs">
            Total {meta?.total || 0} entri aktivitas tercatat di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-4 text-left">Waktu Akses</th>
                  <th className="py-2.5 px-4 text-left">Karyawan</th>
                  <th className="py-2.5 px-4 text-left">NIK</th>
                  <th className="py-2.5 px-4 text-left">IP Address</th>
                  <th className="py-2.5 px-4 text-left">User Agent / Perangkat</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-3 px-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : logs.length > 0 ? (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground font-mono">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground whitespace-nowrap">
                        {log.name}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {log.nik}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {log.ip_address}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-xs text-[11px]" title={log.user_agent}>
                        {log.user_agent}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      Tidak ada riwayat login yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground">
              <span>
                Halaman {meta.page} dari {meta.total_pages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-9 px-3.5 text-xs min-h-[36px]"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                  disabled={page >= meta.total_pages}
                  className="h-9 px-3.5 text-xs min-h-[36px]"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
