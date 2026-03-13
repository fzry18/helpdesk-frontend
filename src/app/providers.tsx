"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { createQueryClient } from "@/lib/query/config"
import { SocketProvider } from "@/features/realtime/providers/SocketProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  // Use optimized query client with proper cache configuration
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        {children}
      </SocketProvider>
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
