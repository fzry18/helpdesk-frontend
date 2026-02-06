import { useInView } from 'react-intersection-observer'
import { useEffect, useState } from 'react'

interface LazyLoadOptions {
  threshold?: number
  triggerOnce?: boolean
  rootMargin?: string
}

export function useLazyLoad(options: LazyLoadOptions = {}) {
  const { threshold = 0, triggerOnce = true, rootMargin = '50px' } = options
  
  const { ref, inView, entry } = useInView({
    threshold,
    triggerOnce,
    rootMargin,
  })

  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (inView && !isLoaded) {
      setIsLoaded(true)
    }
  }, [inView, isLoaded])

  return { ref, isVisible: inView, isLoaded, entry }
}

export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  )
  
  const visibleItems = items.slice(startIndex, endIndex + 1)
  
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight
  
  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    setScrollTop
  }
}