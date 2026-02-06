"use client"

import React, { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-performance'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface DebouncedSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export const DebouncedSearch = React.memo<DebouncedSearchProps>(({ 
  onSearch, 
  placeholder = 'Search tickets...', 
  debounceMs = 300,
  className 
}) => {
  const [query, setQuery] = useState('')
  
  const debouncedSearch = useDebounce(onSearch, debounceMs)
  
  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`pl-8 ${className}`}
      />
    </div>
  )
})