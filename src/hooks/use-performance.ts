import { useCallback, useRef } from 'react'

export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  return debouncedCallback
}

export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  limit: number
): T {
  const inThrottle = useRef<boolean>(false)

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args)
        inThrottle.current = true
        setTimeout(() => {
          inThrottle.current = false
        }, limit)
      }
    },
    [callback, limit]
  ) as T

  return throttledCallback
}