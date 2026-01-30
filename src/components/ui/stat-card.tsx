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
    text: "text-blue-600",
    bg: "bg-blue-100",
    gradient: "from-blue-50 to-blue-100/50",
    trend: "text-blue-600",
  },
  orange: {
    text: "text-orange-600",
    bg: "bg-orange-100",
    gradient: "from-orange-50 to-orange-100/50",
    trend: "text-orange-600",
  },
  green: {
    text: "text-green-600",
    bg: "bg-green-100",
    gradient: "from-green-50 to-green-100/50",
    trend: "text-green-600",
  },
  purple: {
    text: "text-purple-600",
    bg: "bg-purple-100",
    gradient: "from-purple-50 to-purple-100/50",
    trend: "text-purple-600",
  },
  red: {
    text: "text-red-600",
    bg: "bg-red-100",
    gradient: "from-red-50 to-red-100/50",
    trend: "text-red-600",
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
  const colors = colorConfig[color]

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        `bg-gradient-to-br ${colors.gradient}`
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-full p-2", colors.bg)}>
          <Icon className={cn("h-4 w-4", colors.text)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <span
              className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
