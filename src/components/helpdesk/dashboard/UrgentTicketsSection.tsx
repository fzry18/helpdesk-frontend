"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { Ticket } from "@/types"
import { formatRelativeTime } from "@/lib/utils"

interface UrgentTicketsSectionProps {
    tickets?: Ticket[]
    isLoading?: boolean
}

export function UrgentTicketsSection({
    tickets = [],
    isLoading = false,
}: UrgentTicketsSectionProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Tiket Mendesak
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (tickets.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Tiket Mendesak
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="rounded-full bg-green-100 p-3 mb-3">
                            <AlertCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Tidak ada tiket mendesak saat ini
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Tiket Mendesak
                    <Badge variant="destructive" className="ml-auto">
                        {tickets.length}
                    </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Memerlukan perhatian segera
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {tickets.slice(0, 5).map((ticket) => (
                    <div
                        key={ticket.id}
                        className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3 transition-colors hover:bg-red-100/50"
                    >
                        <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                                <Link
                                    href={`/tickets/${ticket.id}`}
                                    className="font-medium text-sm hover:underline"
                                >
                                    {ticket.subject}
                                </Link>
                                <Badge
                                    variant="outline"
                                    className="bg-red-100 text-red-800 border-red-200 text-xs whitespace-nowrap"
                                >
                                    {ticket.priority_label}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                #{ticket.ticket_number}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>oleh {ticket.customer?.name || ticket.customer_name || "Unknown"}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatRelativeTime(ticket.create_date)}
                                </span>
                            </div>
                        </div>
                        <Link href={`/tickets/${ticket.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                ))}
                {tickets.length > 5 && (
                    <Link href="/tickets?priority=4,3">
                        <Button variant="outline" className="w-full" size="sm">
                            Lihat Semua Tiket Mendesak ({tickets.length})
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    )
}
