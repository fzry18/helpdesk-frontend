import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: "blue" | "orange" | "green" | "purple" | "red"
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
}

const colorConfig = {
  blue: {
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200/60 dark:border-blue-900/40",
  },
  orange: {
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50 dark:bg-orange-950/50",
    border: "border-orange-200/60 dark:border-orange-900/40",
  },
  green: {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200/60 dark:border-emerald-900/40",
  },
  purple: {
    text: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-purple-200/60 dark:border-purple-900/40",
  },
  red: {
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/50",
    border: "border-rose-200/60 dark:border-rose-900/40",
  },
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
}: StatCardProps) {
  const colors = colorConfig[color] || colorConfig.blue

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-border/70 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-lg p-2.5 border", colors.bg, colors.border)}>
          <Icon className={cn("h-4 w-4", colors.text)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-1.5 text-xs">
            <span
              className={cn(
                "font-semibold",
                trend.isPositive
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-700 dark:text-rose-400"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">dibanding periode sebelumnya</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

