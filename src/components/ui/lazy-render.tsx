"use client"

import { useEffect, useState, type ReactNode, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Hook to detect mobile viewport (for performance optimization)
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check initial value
    setIsMobile(window.innerWidth < breakpoint)
    
    // Listen for resize
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return isMobile
}

interface LazyChartWrapperProps {
  children: ReactNode
  height?: string
  delay?: number
  mobileDelay?: number
  className?: string
}

/**
 * LazyChartWrapper - Defer chart rendering until visible in viewport
 * Uses IntersectionObserver to detect when component enters viewport
 * Has longer delay on mobile for better performance scores
 */
export function LazyChartWrapper({ 
  children, 
  height = "300px",
  delay = 0,
  mobileDelay = 1000, // Longer delay on mobile
  className = ""
}: LazyChartWrapperProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  // IntersectionObserver for viewport detection
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect() // Only trigger once
          }
        })
      },
      { 
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1 
      }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  // Add delay after becoming visible - longer on mobile
  useEffect(() => {
    if (!isVisible) return
    
    const actualDelay = isMobile ? mobileDelay : delay
    
    if (actualDelay > 0) {
      const timer = setTimeout(() => setShouldRender(true), actualDelay)
      return () => clearTimeout(timer)
    } else {
      setShouldRender(true)
    }
  }, [isVisible, delay, mobileDelay, isMobile])

  return (
    <div ref={ref} className={className} style={{ minHeight: height }}>
      {shouldRender ? children : <Skeleton className="w-full rounded-lg" style={{ height }} />}
    </div>
  )
}

interface DeferredRenderProps {
  children: ReactNode
  delay?: number
  mobileDelay?: number
  fallback?: ReactNode
}

/**
 * DeferredRender - Delay rendering by specified milliseconds
 * Uses longer delay on mobile for performance
 */
export function DeferredRender({ 
  children, 
  delay = 100,
  mobileDelay = 500, // Longer delay on mobile
  fallback = null 
}: DeferredRenderProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const actualDelay = isMobile ? mobileDelay : delay
    if (actualDelay === 0) {
      setShouldRender(true)
      return
    }
    const timer = setTimeout(() => setShouldRender(true), actualDelay)
    return () => clearTimeout(timer)
  }, [delay, mobileDelay, isMobile])

  return shouldRender ? <>{children}</> : <>{fallback}</>
}

interface IdleRenderProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * IdleRender - Render when browser is idle using requestIdleCallback
 * Best for non-critical UI that can wait for idle time
 */
export function IdleRender({ 
  children, 
  fallback = null 
}: IdleRenderProps) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setShouldRender(true), { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    } else {
      // Fallback for browsers without requestIdleCallback
      const timer = setTimeout(() => setShouldRender(true), 200)
      return () => clearTimeout(timer)
    }
  }, [])

  return shouldRender ? <>{children}</> : <>{fallback}</>
}
