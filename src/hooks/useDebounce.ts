import { useEffect, useRef, useState } from "react"

/**
 * Devuelve una version "debounced" de un valor primitivo.
 * Util para evitar llamadas a la API en cada keystroke o cambio de filtro.
 *
 * Ejemplo:
 *   const search = ...
 *   const debouncedSearch = useDebounce(search, 350)
 *   useEffect(() => fetch(debouncedSearch), [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])

  return debounced
}

/**
 * Devuelve una funcion estable que dispara el callback solo despues de un delay
 * sin que cambien sus argumentos. Cancela la llamada anterior si todavia esta pendiente.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (...args: TArgs) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }
}

export default useDebounce
