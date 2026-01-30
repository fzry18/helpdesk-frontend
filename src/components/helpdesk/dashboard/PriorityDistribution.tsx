"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface PriorityDistributionProps {
    data?: Array<{
        name: string
        value: number
        color: string
    }>
    isLoading?: boolean
}

// Mock data for demonstration
const mockData = [
    { name: "Very High", value: 8, color: "#EF4444" },
    { name: "High", value: 15, color: "#F97316" },
    { name: "Medium", value: 42, color: "#F59E0B" },
    { name: "Low", value: 91, color: "#10B981" },
]

export function PriorityDistribution({
    data = mockData,
    isLoading = false,
}: PriorityDistributionProps) {
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

    const total = data.reduce((sum, item) => sum + item.value, 0)

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
                            data={data}
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
                            {data.map((entry, index) => (
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
                    {data.map((item, index) => (
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
