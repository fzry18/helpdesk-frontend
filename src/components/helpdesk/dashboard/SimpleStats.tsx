"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SimplePriorityStatsProps {
  data?: {
    very_low: number
    low: number
    normal: number
    high: number
    very_high: number
  }
}

const PRIORITY_CONFIG = {
  very_high: { name: "Sangat Tinggi", color: "bg-red-500" },
  high: { name: "Tinggi", color: "bg-orange-500" },
  normal: { name: "Normal", color: "bg-yellow-500" },
  low: { name: "Rendah", color: "bg-green-500" },
  very_low: { name: "Sangat Rendah", color: "bg-gray-500" },
}

/**
 * Lightweight priority distribution without Recharts
 * For mobile or low-performance scenarios
 */
export function SimplePriorityStats({ data }: SimplePriorityStatsProps) {
  if (!data) return null

  const entries = Object.entries(data).filter(([_, v]) => (v as number) > 0)
  const total = entries.reduce((sum, [_, v]) => sum + (v as number), 0)

  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribusi Prioritas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Tidak ada data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribusi Prioritas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([key, value]) => {
          const config = PRIORITY_CONFIG[key as keyof typeof PRIORITY_CONFIG]
          const percentage = Math.round(((value as number) / total) * 100)
          
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{config?.name || key}</span>
                <span className="font-medium">{value as number} ({percentage}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${config?.color || 'bg-gray-500'} rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

interface SimpleTrendStatsProps {
  created?: number
  resolved?: number
  period?: string
}

/**
 * Lightweight trend stats without Recharts LineChart
 * For mobile or low-performance scenarios
 */
export function SimpleTrendStats({ created = 0, resolved = 0, period = "30 Hari" }: SimpleTrendStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Trend Tiket ({period})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{created}</p>
            <p className="text-sm text-muted-foreground">Dibuat</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{resolved}</p>
            <p className="text-sm text-muted-foreground">Diselesaikan</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
