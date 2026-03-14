import { useState, useEffect } from "react";

/**
 * Debounce a value by the given delay (ms).
 * Useful for search inputs that trigger API calls.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
