"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
    data?: Array<{
        date: string
        created: number
        resolved: number
    }>
    isLoading?: boolean
}

// Mock data for demonstration
const mockData = [
    { date: "Jan 01", created: 12, resolved: 8 },
    { date: "Jan 05", created: 15, resolved: 10 },
    { date: "Jan 10", created: 18, resolved: 14 },
    { date: "Jan 15", created: 14, resolved: 16 },
    { date: "Jan 20", created: 20, resolved: 18 },
    { date: "Jan 25", created: 16, resolved: 15 },
    { date: "Jan 30", created: 22, resolved: 20 },
]

export function TicketTrendChart({
    data = mockData,
    isLoading = false,
}: TicketTrendChartProps) {
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
                    <LineChart data={data}>
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
