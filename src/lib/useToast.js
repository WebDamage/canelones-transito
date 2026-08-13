import { useCallback, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null) // { msg, type }
  const timerRef = useRef(null)

  const show = useCallback((msg, type = '', duration = 3000) => {
    clearTimeout(timerRef.current)
    setToast({ msg, type })
    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  return { toast, show }
}
