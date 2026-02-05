"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardAPI } from "@/lib/api/endpoints"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface PriorityDistributionProps {
    isLoading?: boolean
}

// Priority colors
const PRIORITY_CONFIG = {
    very_high: { name: "Sangat Tinggi", color: "#EF4444" },
    high: { name: "Tinggi", color: "#F97316" },
    normal: { name: "Normal", color: "#F59E0B" },
    low: { name: "Rendah", color: "#10B981" },
    very_low: { name: "Sangat Rendah", color: "#6B7280" },
}

export function PriorityDistribution({
    isLoading: externalLoading = false,
}: PriorityDistributionProps) {
    const { data: statsResponse, isLoading: statsLoading } = useQuery({
        queryKey: ["dashboard", "stats"],
        queryFn: () => dashboardAPI.getStats(),
    })

    const isLoading = externalLoading || statsLoading

    // Transform API data for chart
    const priorityData = statsResponse?.data?.by_priority
    const chartData = priorityData
        ? Object.entries(priorityData)
              .filter(([_, value]) => (value as number) > 0)
              .map(([key, value]) => ({
                  name: PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.name || key,
                  value: value as number,
                  color: PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]?.color || "#6B7280",
              }))
        : []

    const total = chartData.reduce((sum, item) => sum + item.value, 0)

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Distribusi Prioritas</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        )
    }

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Distribusi Prioritas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Tidak ada data tiket
                    </p>
                </CardHeader>
                <CardContent className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">Belum ada tiket</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribusi Prioritas</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Total {total} tiket aktif
                </p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) =>
                                `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                            }
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "0.5rem",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-muted-foreground">{item.name}:</span>
                            <span className="font-medium">{item.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
