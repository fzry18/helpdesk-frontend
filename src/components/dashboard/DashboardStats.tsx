"use client"

import { useQuery } from "@tanstack/react-query"
import { dashboardAPI } from "@/lib/api/endpoints"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Ticket, Clock, CheckCircle2, XCircle, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardStatsProps {
    departmentId?: number
}

export function DashboardStats({ departmentId }: DashboardStatsProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["dashboard-stats", departmentId],
        queryFn: () => dashboardAPI.getStats(),
        refetchInterval: 30000, // Refresh setiap 30 detik
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>
                        Gagal memuat statistik dashboard
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const stats = data?.data

    const statsConfig = [
        {
            title: "Total Tiket",
            value: stats?.summary?.total || 0,
            icon: Ticket,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            title: "Tiket Terbuka",
            value: stats?.summary?.open || 0,
            icon: Clock,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
        },
        {
            title: "Tiket Selesai",
            value: stats?.summary?.closed || 0,
            icon: CheckCircle2,
            color: "text-green-600",
            bgColor: "bg-green-50",
        },
        {
            title: "Belum Ditugaskan",
            value: stats?.summary?.unassigned || 0,
            icon: Users,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
        },
        {
            title: "Hari Ini",
            value: stats?.period?.today || 0,
            icon: XCircle,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {statsConfig.map((stat) => (
                <Card key={stat.title} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {stat.title}
                        </CardTitle>
                        <div className={cn("rounded-lg p-2", stat.bgColor)}>
                            <stat.icon className={cn("h-4 w-4", stat.color)} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

