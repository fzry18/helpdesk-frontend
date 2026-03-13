/**
 * StatsCard — Presentational KPI card.
 *
 * Renders a single metric with a label, icon, and optional trend badge.
 * No business logic — all data must be passed via props.
 */

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReactNode } from "react"

interface StatsCardProps {
  /** Title label */
  label: string
  /** Primary numeric value */
  value: number | string
  /** Optional supporting text shown below the value */
  description?: string
  /** Icon element rendered inline with the label */
  icon?: ReactNode
  /** Extra CSS classes for card root */
  className?: string
  /** Show skeleton while loading */
  isLoading?: boolean
}

export function StatsCard({
  label,
  value,
  description,
  icon,
  className,
  isLoading = false,
}: StatsCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-16 mb-2" />
          {description && <Skeleton className="h-3 w-32" />}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon && (
            <span className="text-muted-foreground">{icon}</span>
          )}
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
