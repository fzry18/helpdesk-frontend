"use client"

import React, { useMemo, useState, useCallback } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { TicketCard } from "./TicketCard"
import { TicketSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { DebouncedSearch } from "@/components/ui/debounced-search"
import { Inbox } from "lucide-react"
import { useDebounce } from "@/hooks/use-performance"
import type { Ticket } from "@/types"

const STATUS_ORDER: ("Open" | "In Progress" | "Closed" | "Rejected")[] = ["Open", "In Progress", "Closed", "Rejected"]
const STATUS_LABELS: Record<"Open" | "In Progress" | "Closed" | "Rejected", string> = {
  Open: "Terbuka",
  "In Progress": "In Progress", 
  Closed: "Selesai",
  Rejected: "Ditolak",
}

// Virtual list item height
const ITEM_HEIGHT = 220

/** Group by stage/status (sama dengan RecentTickets). Daftar hasil filter lalu dikelompokkan. */
function getTicketStatusGroup(ticket: Ticket): "Open" | "In Progress" | "Closed" | "Rejected" {
  if (ticket.is_rejected) return "Rejected"
  const name = ((ticket.stage?.actual_name ?? ticket.stage?.name) ?? "").toString().toLowerCase()
  if (
    name.includes("closed") ||
    name.includes("selesai") ||
    ticket.resolution_confirmed === true
  )
    return "Closed"
  if (
    name.includes("progress") ||
    name.includes("in progress") ||
    name.includes("awaiting") ||
    name.includes("confirmation") ||
    name.includes("menunggu")
  )
    return "In Progress"
  return "Open"
}

// Virtual List Component using @tanstack/react-virtual
function VirtualTicketList({ tickets, height }: { tickets: Ticket[], height: number }) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  })

  return (
    <div
      ref={parentRef}
      style={{
        height,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <div className="px-4 pb-4">
              <TicketCard 
                ticket={tickets[virtualItem.index]} 
                index={virtualItem.index}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TicketListProps {
  tickets: Ticket[] | null
  isLoading: boolean
  enableVirtualization?: boolean
  containerHeight?: number
  enableSearch?: boolean
}

export function TicketList({ 
  tickets, 
  isLoading, 
  enableVirtualization = false,
  containerHeight = 600,
  enableSearch = false
}: TicketListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  const handleSearch = useCallback((query: string) => {
    setSearchTerm(query)
  }, [])

  // Filter tickets based on search
  const filteredTickets = useMemo(() => {
    if (!tickets) return []
    if (!searchTerm) return tickets
    
    return tickets.filter(ticket => 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [tickets, searchTerm])

  const visibleGroups = useMemo(() => {
    if (!filteredTickets || filteredTickets.length === 0) return [] as Array<{ key: "Open" | "In Progress" | "Closed" | "Rejected"; tickets: Ticket[] }>

    const groups: Record<"Open" | "In Progress" | "Closed" | "Rejected", Ticket[]> = {
      Open: [],
      "In Progress": [],
      Closed: [],
      Rejected: [],
    }
    for (const t of filteredTickets) {
      const group = getTicketStatusGroup(t)
      groups[group].push(t)
    }

    return STATUS_ORDER.filter((key) => groups[key].length > 0).map((key) => ({
      key,
      tickets: groups[key],
    }))
  }, [filteredTickets])

  // Virtual scrolling using @tanstack/react-virtual
  const renderVirtualList = useCallback(() => {
    if (!filteredTickets?.length) return null
    
    return (
      <div style={{ height: containerHeight, overflow: 'auto' }}>
        <VirtualTicketList 
          tickets={filteredTickets}
          height={containerHeight}
        />
      </div>
    )
  }, [filteredTickets, containerHeight])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-6 w-32 animate-pulse bg-gray-200 rounded" />
            <TicketSkeleton />
            <TicketSkeleton />
          </div>
        ))}
      </div>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No tickets found"
        description="Change filters or create a new ticket"
      />
    )
  }

  // Use virtualization for large lists
  if (enableVirtualization && filteredTickets.length > 50) {
    return (
      <div className="space-y-4">
        {enableSearch && (
          <DebouncedSearch 
            onSearch={handleSearch}
            placeholder="Search tickets..."
            className="max-w-md"
          />
        )}
        <div className="text-sm text-muted-foreground">
          Showing {filteredTickets.length} tickets (Virtual Scrolling Enabled)
        </div>
        {renderVirtualList()}
      </div>
    )
  }

  // Regular grouped display for smaller lists
  return (
    <div className="space-y-8">
      {enableSearch && (
        <DebouncedSearch 
          onSearch={handleSearch}
          placeholder="Search tickets..."
          className="max-w-md"
        />
      )}
      {visibleGroups.map(({ key, tickets: list }) => (
        <section key={key} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {STATUS_LABELS[key]} ({list.length})
          </h2>
          <div className="space-y-4">
            {list.map((ticket, index) => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                index={index}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
