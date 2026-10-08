"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { AlertCircle, CheckCircle } from "lucide-react"

interface PriorityDistributionProps {
  data?: Array<{
    priority?: string
    name: string
    value: number
    color: string
  }>
  isLoading?: boolean
}

export function PriorityDistribution({
  data = [],
  isLoading = false,
}: PriorityDistributionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Distribusi Prioritas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
  const activeItems = data.filter((item) => item.value > 0)

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          Distribusi Prioritas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {total > 0 ? `Total ${total} tiket aktif` : "Tidak ada tiket aktif saat ini"}
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center p-4 space-y-2">
            <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 p-3 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-foreground">Semua Tiket Selesai</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Saat ini tidak ada tiket terbuka yang membutuhkan penanganan.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={activeItems}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${typeof percent === "number" ? (percent * 100).toFixed(0) : 0}%`
                  }
                >
                  {activeItems.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: any, name: any) => [`${value} tiket`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-muted/30">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {item.value}{" "}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
