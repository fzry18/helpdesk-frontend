"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    TicketPlus,
    UserPlus,
    CheckCircle2,
    MessageSquare,
    Activity,
} from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import Link from "next/link"

interface ActivityItem {
    id: number
    type: "ticket_created" | "ticket_assigned" | "ticket_closed" | "comment_added"
    user: string
    description: string
    timestamp: string
    ticketId?: number
    ticketNumber?: string
}

interface ActivityTimelineProps {
    activities?: ActivityItem[]
    isLoading?: boolean
}

// Mock data for demonstration
const mockActivities: ActivityItem[] = [
    {
        id: 1,
        type: "ticket_created",
        user: "Fazry",
        description: "membuat tiket #TKT00018",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ticketId: 18,
        ticketNumber: "TKT00018",
    },
    {
        id: 2,
        type: "ticket_assigned",
        user: "John",
        description: "menugaskan tiket #TKT00015 ke IT Team",
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        ticketId: 15,
        ticketNumber: "TKT00015",
    },
    {
        id: 3,
        type: "ticket_closed",
        user: "Sarah",
        description: "menutup tiket #TKT00012",
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        ticketId: 12,
        ticketNumber: "TKT00012",
    },
    {
        id: 4,
        type: "comment_added",
        user: "Mitchell",
        description: "menambahkan komentar di #TKT00018",
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        ticketId: 18,
        ticketNumber: "TKT00018",
    },
    {
        id: 5,
        type: "ticket_created",
        user: "Alice",
        description: "membuat tiket #TKT00017",
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        ticketId: 17,
        ticketNumber: "TKT00017",
    },
]

const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
        case "ticket_created":
            return <TicketPlus className="h-4 w-4" />
        case "ticket_assigned":
            return <UserPlus className="h-4 w-4" />
        case "ticket_closed":
            return <CheckCircle2 className="h-4 w-4" />
        case "comment_added":
            return <MessageSquare className="h-4 w-4" />
        default:
            return <Activity className="h-4 w-4" />
    }
}

const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
        case "ticket_created":
            return "bg-blue-100 text-blue-600"
        case "ticket_assigned":
            return "bg-purple-100 text-purple-600"
        case "ticket_closed":
            return "bg-green-100 text-green-600"
        case "comment_added":
            return "bg-orange-100 text-orange-600"
        default:
            return "bg-gray-100 text-gray-600"
    }
}

export function ActivityTimeline({
    activities = mockActivities,
    isLoading = false,
}: ActivityTimelineProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Aktivitas Terbaru
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Aktivitas Terbaru
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Riwayat aktivitas sistem
                </p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.map((activity, index) => (
                        <div key={activity.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`rounded-full p-2 ${getActivityColor(activity.type)}`}
                                >
                                    {getActivityIcon(activity.type)}
                                </div>
                                {index < activities.length - 1 && (
                                    <div className="w-0.5 flex-1 bg-border my-1" />
                                )}
                            </div>
                            <div className="flex-1 pb-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <p className="text-sm">
                                            <span className="font-medium">{activity.user}</span>{" "}
                                            {activity.ticketId ? (
                                                <>
                                                    {activity.description.split("#")[0]}
                                                    <Link
                                                        href={`/tickets/${activity.ticketId}`}
                                                        className="text-primary hover:underline font-medium"
                                                    >
                                                        #{activity.ticketNumber}
                                                    </Link>
                                                </>
                                            ) : (
                                                activity.description
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatRelativeTime(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
