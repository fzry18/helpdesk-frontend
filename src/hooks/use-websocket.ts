// WebSocket hook for real-time updates
import { useEffect, useRef, useState } from 'react'

interface WebSocketConfig {
  url: string
  reconnectAttempts?: number
  reconnectInterval?: number
}

export function useWebSocket({ url, reconnectAttempts = 5, reconnectInterval = 3000 }: WebSocketConfig) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const reconnectCount = useRef(0)

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(url)
        
        ws.onopen = () => {
          setIsConnected(true)
          reconnectCount.current = 0
          console.log('WebSocket connected')
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            setLastMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
        
        ws.onclose = () => {
          setIsConnected(false)
          setSocket(null)
          
          // Attempt to reconnect
          if (reconnectCount.current < reconnectAttempts) {
            setTimeout(() => {
              reconnectCount.current++
              console.log(`WebSocket reconnecting... (${reconnectCount.current}/${reconnectAttempts})`)
              connectWebSocket()
            }, reconnectInterval)
          }
        }
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }
        
        setSocket(ws)
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [url, reconnectAttempts, reconnectInterval])

  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message))
    }
  }

  return { socket, isConnected, lastMessage, sendMessage }
}