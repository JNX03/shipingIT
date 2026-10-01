import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Refresh calendar-derived UI at local midnight and after a backgrounded session. */
export function useLocalDay() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const current = new Date();
    const midnight = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    const timeout = setTimeout(() => setNow(new Date()), Math.max(250, midnight.getTime() - current.getTime() + 250));
    return () => clearTimeout(timeout);
  }, [now]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(new Date());
    });
    return () => subscription.remove();
  }, []);
  return now;
}
