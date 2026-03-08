'use client'

import { useRef, useState, useCallback } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number  // px pull distance to trigger (default: 80)
  enabled?: boolean   // can disable on desktop
}

interface PullToRefreshResult {
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
  pullDistance: number  // current pull px (0..threshold)
  isRefreshing: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: PullToRefreshOptions): PullToRefreshResult {
  const startY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return
      startY.current = e.touches[0].clientY
    },
    [enabled],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isRefreshing) return
      // Only trigger if the page itself is scrolled to the top
      if ((document.scrollingElement?.scrollTop ?? window.scrollY) > 0) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        setPullDistance(Math.min(delta, threshold * 1.5))
      }
    },
    [enabled, isRefreshing, threshold],
  )

  const onTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing) return
    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(0)
      try {
        await onRefresh()
      } catch {
        // onRefresh errors are handled by the caller; we just ensure cleanup
      } finally {
        setIsRefreshing(false)
      }
    } else {
      setPullDistance(0)
    }
  }, [enabled, isRefreshing, pullDistance, threshold, onRefresh])

  return {
    containerProps: { onTouchStart, onTouchMove, onTouchEnd },
    pullDistance,
    isRefreshing,
  }
}
