"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { TrendingUp, Calendar } from "lucide-react"

interface TicketTrendChartProps {
  data?: Array<{
    date: string
    created: number
    resolved: number
  }>
  days?: number
  onDaysChange?: (days: number) => void
  isLoading?: boolean
}

export function TicketTrendChart({
  data = [],
  days = 30,
  onDaysChange,
  isLoading = false,
}: TicketTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trend Tiket ({days} Hari Terakhir)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const totalCreated = data.reduce((sum, item) => sum + (item.created || 0), 0)
  const totalResolved = data.reduce((sum, item) => sum + (item.resolved || 0), 0)

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Trend Tiket ({days} Hari Terakhir)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {totalCreated} tiket dibuat · {totalResolved} diselesaikan
          </p>
        </div>

        {onDaysChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <Select
              value={String(days)}
              onValueChange={(val) => onDaysChange(parseInt(val))}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="Pilih rentang" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="7">7 Hari</SelectItem>
                <SelectItem value="14">14 Hari</SelectItem>
                <SelectItem value="30">30 Hari</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">
            Belum ada data tiket dalam rentang {days} hari terakhir.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
              <XAxis
                dataKey="date"
                className="text-[11px]"
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-[11px]"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="created"
                stroke="#3B82F6"
                strokeWidth={2.5}
                name="Dibuat"
                dot={{ fill: "#3B82F6", r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="#059669"
                strokeWidth={2.5}
                name="Diselesaikan"
                dot={{ fill: "#059669", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
