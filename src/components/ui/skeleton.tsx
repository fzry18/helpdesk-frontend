import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  height?: string | number
  width?: string | number
  circle?: boolean
}

export function Skeleton({ 
  className, 
  lines = 1, 
  height = '1rem',
  width = '100%',
  circle = false,
  ...props
}: SkeletonProps) {
  if (lines === 1) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-md bg-muted',
          circle ? 'rounded-full' : 'rounded-md',
          className
        )}
        style={{ height, width }}
        {...props}
      />
    )
  }

  const skeletons = Array.from({ length: lines })

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {skeletons.map((_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse bg-muted',
            circle ? 'rounded-full' : 'rounded-md'
          )}
          style={{ 
            height, 
            width: lines > 1 && index === lines - 1 ? '75%' : width 
          }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 animate-pulse">
      <div className="flex items-center space-x-2">
        <Skeleton circle width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </div>
      </div>
      <Skeleton lines={3} />
      <div className="flex justify-between">
        <Skeleton width="20%" />
        <Skeleton width="30%" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex space-x-4 p-4 border-b animate-pulse">
          <Skeleton width={50} />
          <Skeleton width="25%" />
          <Skeleton width="30%" />
          <Skeleton width="20%" />
          <Skeleton width="15%" />
        </div>
      ))}
    </div>
  )
}

export function TicketSkeleton() {
  return <CardSkeleton />
}
