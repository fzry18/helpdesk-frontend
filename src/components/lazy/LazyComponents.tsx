import React from 'react'
import dynamic from 'next/dynamic'

// Lazy load dengan preload strategies
export const LazyRecentTickets = dynamic(
  () => import('../helpdesk/dashboard/RecentTickets').then(mod => ({ default: mod.RecentTickets })),
  {
    loading: () => (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded mb-3"></div>
        ))}
      </div>
    ),
    ssr: false,
  }
)

export const LazyTicketList = dynamic(
  () => import('../helpdesk/tickets/TicketList').then(mod => ({ default: mod.TicketList })),
  {
    loading: () => (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded"></div>
        ))}
      </div>
    ),
    ssr: false,
  }
)

export const LazyTicketCard = dynamic(
  () => import('../helpdesk/tickets/TicketCard').then(mod => ({ default: mod.TicketCard })),
  {
    loading: () => <div className="h-24 bg-gray-100 rounded animate-pulse"></div>,
    ssr: false,
  }
)

// Progressive enhancement - load critical first, others later
export const LazyDashboardStats = dynamic(
  () => import('../helpdesk/dashboard/DashboardStats').then(mod => ({ default: mod.DashboardStats })),
  {
    loading: () => (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
        ))}
      </div>
    ),
    ssr: true, // Critical component - render on server
  }
)

export const LazyUserDashboardStats = dynamic(
  () => import('../helpdesk/dashboard/UserDashboardStats').then(mod => ({ default: mod.UserDashboardStats })),
  {
    loading: () => (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
        ))}
      </div>
    ),
    ssr: true,
  }
)

// Intersection observer untuk lazy loading yang lebih pintar
export const useLazyLoad = (rootMargin = '50px') => {
  const [inView, setInView] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          // Once loaded, disconnect observer to improve performance
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin])

  return [ref, inView] as const
}