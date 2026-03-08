'use client'
import { useRef, useState, useCallback } from 'react'

interface SwipeOptions {
  threshold?: number        // px to trigger action (default: 60)
  onSwipeLeft?: () => void
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
  onTouchCancel: () => void
  swipeOffset: number       // current px offset (negative = left)
  isSwiping: boolean
}

export function useSwipeGesture({ threshold = 60, onSwipeLeft }: SwipeOptions): SwipeHandlers {
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null   // direction not yet determined
    setSwipeOffset(0)             // clear any stale offset from prior cancelled gesture
    setIsSwiping(true)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - startX.current
    const deltaY = e.touches[0].clientY - startY.current

    // Determine axis lock on first meaningful movement
    if (isHorizontal.current === null && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY)
    }

    // Only respond to horizontal-dominant left swipes
    if (isHorizontal.current && deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -threshold * 2))
    }
  }, [threshold])

  const reset = useCallback(() => {
    setIsSwiping(false)
    setSwipeOffset(0)
    isHorizontal.current = null
  }, [])

  const onTouchEnd = useCallback(() => {
    if (swipeOffset <= -threshold) {
      onSwipeLeft?.()
    }
    reset()
  }, [swipeOffset, threshold, onSwipeLeft, reset])

  const onTouchCancel = useCallback(() => {
    reset()
  }, [reset])

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, swipeOffset, isSwiping }
}
