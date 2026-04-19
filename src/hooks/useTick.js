import { useEffect, useRef, useState } from 'react';

// Returns the current wall-clock time every `interval` ms while `active` is true.
// Driven by real timestamps so accuracy is preserved across navigations.
export function useTick(active, interval = 250) {
  const [, setTick] = useState(0);
  const ref = useRef();
  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => setTick((t) => t + 1), interval);
    return () => clearInterval(ref.current);
  }, [active, interval]);
}
