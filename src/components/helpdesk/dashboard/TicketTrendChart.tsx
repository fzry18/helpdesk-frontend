"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardAPI } from "@/lib/api/endpoints"
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

interface TicketTrendChartProps {
    isLoading?: boolean
}

export function TicketTrendChart({
    isLoading: externalLoading = false,
}: TicketTrendChartProps) {
    const { data: trendsResponse, isLoading: trendsLoading } = useQuery({
        queryKey: ["dashboard", "trends"],
        queryFn: () => dashboardAPI.getTrends("month"),
        staleTime: 5 * 60 * 1000, // 5 min cache - chart data doesn't change often
        refetchOnWindowFocus: false, // Don't refetch when tab regains focus
        refetchOnMount: false, // Don't refetch if data exists
    })

    // Transform API data for chart
    const chartData = trendsResponse?.data
        ? trendsResponse.data.map((item: { date: string; created: number; resolved: number }) => ({
              date: item.date,
              created: item.created,
              resolved: item.resolved,
          }))
        : []

    const isLoading = externalLoading || trendsLoading
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Trend Tiket (30 Hari Terakhir)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trend Tiket (30 Hari Terakhir)</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Perbandingan tiket yang dibuat vs diselesaikan
                </p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            className="text-xs"
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
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
                        <Line
                            type="monotone"
                            dataKey="created"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            name="Dibuat"
                            dot={{ fill: "#3B82F6" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="resolved"
                            stroke="#10B981"
                            strokeWidth={2}
                            name="Diselesaikan"
                            dot={{ fill: "#10B981" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
