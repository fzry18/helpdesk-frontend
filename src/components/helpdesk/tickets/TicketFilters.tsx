"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { masterDataAPI } from "@/lib/api/endpoints"
import { Search, X } from "lucide-react"

interface TicketFiltersProps {
  onFilterChange: (filters: {
    search?: string
    stage_id?: number
    team_id?: number
    priority?: string
    status?: "open" | "closed" | "all"
    ticket_category_type?: "system" | "helper"
    system_category?: string
    my_tickets?: boolean
  }) => void
  showMyTickets?: boolean
}

export function TicketFilters({ onFilterChange, showMyTickets = true }: TicketFiltersProps) {
  const [search, setSearch] = useState("")
  const [stageId, setStageId] = useState<string>("all")
  const [teamId, setTeamId] = useState<string>("all")
  const [priority, setPriority] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [categoryType, setCategoryType] = useState<string>("all")
  const [systemCategory, setSystemCategory] = useState<string>("all")
  const [myTicketsOnly, setMyTicketsOnly] = useState(false)

  const { data: masterData } = useQuery({
    queryKey: ["master-data"],
    queryFn: () => masterDataAPI.getAll(),
  })

  useEffect(() => {
    const filters: any = {
      status: status as "open" | "closed" | "all",
    }
    if (search) filters.search = search
    if (stageId && stageId !== "all") filters.stage_id = parseInt(stageId)
    if (teamId && teamId !== "all") filters.team_id = parseInt(teamId)
    if (priority && priority !== "all") filters.priority = priority
    if (categoryType === "helper" || categoryType === "system")
      filters.ticket_category_type = categoryType
    if (systemCategory && systemCategory !== "all") filters.system_category = systemCategory
    if (myTicketsOnly) filters.my_tickets = true
    onFilterChange(filters)
  }, [search, stageId, teamId, priority, status, categoryType, systemCategory, myTicketsOnly, onFilterChange])

  const clearFilters = () => {
    setSearch("")
    setStageId("all")
    setTeamId("all")
    setPriority("all")
    setStatus("all")
    setCategoryType("all")
    setSystemCategory("all")
    setMyTicketsOnly(false)
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryType} onValueChange={setCategoryType}>
          <SelectTrigger>
            <SelectValue placeholder="Tipe Tiket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="helper">Ticketing Helper</SelectItem>
            <SelectItem value="system">Ticketing System</SelectItem>
          </SelectContent>
        </Select>

        {categoryType === "system" && (
          <Select value={systemCategory} onValueChange={setSystemCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Sistem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="odoo">Odoo</SelectItem>
              <SelectItem value="p2h">Web P2H</SelectItem>
              <SelectItem value="job_portal">Job Portal</SelectItem>
              <SelectItem value="other">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Priority</SelectItem>
            <SelectItem value="4">Very High</SelectItem>
            <SelectItem value="3">High</SelectItem>
            <SelectItem value="2">Normal</SelectItem>
            <SelectItem value="1">Low</SelectItem>
            <SelectItem value="0">Very Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stageId} onValueChange={setStageId}>
          <SelectTrigger>
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Stage</SelectItem>
            {masterData?.data?.stages?.map((stage) => (
              <SelectItem key={stage.id} value={stage.id.toString()}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger>
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Team</SelectItem>
            {masterData?.data?.teams?.map((team) => (
              <SelectItem key={team.id} value={team.id.toString()}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showMyTickets && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="my_tickets"
              checked={myTicketsOnly}
              onChange={(e) => setMyTicketsOnly(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="my_tickets" className="text-sm whitespace-nowrap">
              Tiket saya saja
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
