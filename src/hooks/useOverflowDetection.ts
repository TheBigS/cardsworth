import { useEffect, useState, RefObject } from 'react'

export function useOverflowDetection(ref: RefObject<HTMLElement | null>): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const checkOverflow = () => {
      setIsOverflowing(element.scrollHeight > element.clientHeight)
    }

    // Check immediately
    checkOverflow()

    // Create observer for content changes
    const observer = new MutationObserver(checkOverflow)
    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    // Also check on resize
    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(element)

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [ref])

  return isOverflowing
}
