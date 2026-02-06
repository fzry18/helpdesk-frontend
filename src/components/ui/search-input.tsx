import { useState, useEffect, useMemo } from 'react'
import { useDebounce } from '@/hooks/use-performance'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchInputProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({ 
  onSearch, 
  placeholder = 'Search...', 
  debounceMs = 300,
  className 
}: SearchInputProps) {
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
}

// Hook for optimized pagination
export function usePagination(
  totalItems: number,
  itemsPerPage: number = 10
) {
  const [currentPage, setCurrentPage] = useState(1)

  const pagination = useMemo(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

    return {
      currentPage,
      totalPages,
      startIndex,
      endIndex,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      itemsPerPage,
      totalItems
    }
  }, [totalItems, itemsPerPage, currentPage])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, pagination.totalPages)))
  }

  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)
  const goToFirstPage = () => goToPage(1)
  const goToLastPage = () => goToPage(pagination.totalPages)

  return {
    ...pagination,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage
  }
}