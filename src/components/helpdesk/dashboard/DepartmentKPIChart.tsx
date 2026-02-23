"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { Ticket } from "@/types"

interface DepartmentKPIChartProps {
  tickets: Ticket[]
  isLoading?: boolean
}

function getTicketStatusGroup(t: Ticket): "Open" | "In Progress" | "Closed" | "Rejected" {
  if (t.is_rejected) return "Rejected"
  const name = ((t.stage?.actual_name ?? t.stage?.name) ?? "").toString().toLowerCase()
  if (name.includes("closed") || name.includes("selesai") || t.resolution_confirmed === true) return "Closed"
  if (name.includes("progress") || name.includes("in progress") || name.includes("awaiting") || name.includes("confirmation") || name.includes("menunggu")) return "In Progress"
  return "Open"
}

export function DepartmentKPIChart({
  tickets,
  isLoading = false,
}: DepartmentKPIChartProps) {
  // Group tickets by department and count Closed vs Rejected
  const departmentData = useMemo(() => {
    const deptMap = new Map<string, { closed: number; rejected: number; name: string }>()

    for (const ticket of tickets) {
      const deptName = ticket.department_name || "Tidak Diketahui"
      const statusGroup = getTicketStatusGroup(ticket)

      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { closed: 0, rejected: 0, name: deptName })
      }

      const deptData = deptMap.get(deptName)!
      if (statusGroup === "Closed") {
        deptData.closed++
      } else if (statusGroup === "Rejected") {
        deptData.rejected++
      }
    }

    // Convert to array and sort by total (closed + rejected) descending
    return Array.from(deptMap.values())
      .filter((d) => d.closed > 0 || d.rejected > 0) // Only show departments with closed/rejected tickets
      .sort((a, b) => (b.closed + b.rejected) - (a.closed + a.rejected))
      .slice(0, 10) // Limit to top 10 departments
  }, [tickets])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KPI Ticket per Departemen</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (departmentData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KPI Ticket per Departemen</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tidak ada data tiket yang diselesaikan atau ditolak
          </p>
        </CardHeader>
        <CardContent className="flex h-[350px] items-center justify-center">
          <p className="text-muted-foreground">Belum ada data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPI Ticket per Departemen</CardTitle>
        <p className="text-sm text-muted-foreground">
          Jumlah ticket yang diselesaikan dan ditolak per departemen
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={departmentData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
            <Bar
              dataKey="closed"
              fill="#10B981"
              name="Diselesaikan"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="rejected"
              fill="#EF4444"
              name="Ditolak"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
