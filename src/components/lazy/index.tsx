import dynamic from 'next/dynamic'
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy components dengan optimasi
export const LazyRecentTickets = dynamic(
  () => import('@/components/helpdesk/dashboard/RecentTickets').then(mod => ({ default: mod.RecentTickets })),
  {
    loading: () => React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'h-6 w-48 animate-pulse bg-gray-200 rounded' }),
      React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
        [1, 2, 3].map((i) => React.createElement(Skeleton, { key: i, height: '320px', className: 'rounded-lg' }))
      )
    ),
    ssr: false,
  }
)

export const LazyTicketList = dynamic(
  () => import('@/components/helpdesk/tickets/TicketList').then(mod => ({ default: mod.TicketList })),
  {
    loading: () => React.createElement('div', { className: 'space-y-4' },
      [1, 2, 3, 4, 5].map((i) => React.createElement(Skeleton, { key: i, height: '200px', className: 'rounded-lg' }))
    ),
    ssr: false,
  }
)