"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"

export interface TicketFilterValues {
  status?: "open" | "closed" | "in_progress" | "draft" | "rejected" | "all"
  ticket_category_type?: "system" | "helper"
  priority?: string
}

interface TicketFiltersProps {
  onFilterChange: (filters: TicketFilterValues) => void
  initialStatus?: TicketFilterValues["status"]
}

type OpenFilter = "status" | "priority" | "type" | null

export function TicketFilters({ onFilterChange, initialStatus }: TicketFiltersProps) {
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null)
  const [priority, setPriority] = useState<string>("all")
  const [status, setStatus] = useState<string>(initialStatus || "all")
  const [categoryType, setCategoryType] = useState<string>("all")

  useEffect(() => {
    const filters: TicketFilterValues = {
      status: status as TicketFilterValues["status"],
    }
    if (categoryType === "helper" || categoryType === "system")
      filters.ticket_category_type = categoryType
    if (priority && priority !== "all") filters.priority = priority
    onFilterChange(filters)
  }, [priority, status, categoryType, onFilterChange])

  const clearFilters = () => {
    setPriority("all")
    setStatus("all")
    setCategoryType("all")
  }

  return (
    <div className="rounded-lg border bg-card p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <Select
          value={status}
          onValueChange={setStatus}
          open={openFilter === "status"}
          onOpenChange={(open) => setOpenFilter(open ? "status" : null)}
        >
          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px]">
            <SelectValue placeholder="Status Tiket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Selesai</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryType}
          onValueChange={setCategoryType}
          open={openFilter === "type"}
          onOpenChange={(open) => setOpenFilter(open ? "type" : null)}
        >
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-[140px] md:w-[160px]">
            <SelectValue placeholder="Tipe Tiket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="helper">Ticketing Helper</SelectItem>
            <SelectItem value="system">Ticketing System</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priority}
          onValueChange={setPriority}
          open={openFilter === "priority"}
          onOpenChange={(open) => setOpenFilter(open ? "priority" : null)}
        >
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-[140px] md:w-[160px]">
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Prioritas</SelectItem>
            <SelectItem value="4">Very High</SelectItem>
            <SelectItem value="3">High</SelectItem>
            <SelectItem value="2">Normal</SelectItem>
            <SelectItem value="1">Low</SelectItem>
            <SelectItem value="0">Very Low</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={clearFilters} size="sm" className="w-full sm:w-auto">
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  )
}
