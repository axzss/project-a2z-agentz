'use client';
import { useCallback, useEffect, useState } from 'react';

export type Density = 'default' | 'compact';

export function usePreferences() {
  const [density, setDensityState] = useState<Density>(() => {
    if (typeof window === 'undefined') return 'default';
    const stored = window.localStorage.getItem('a2z-density') as Density | null;
    return stored === 'default' || stored === 'compact' ? stored : 'default';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('a2z-density', d);
      document.documentElement.setAttribute('data-density', d);
    }
  }, []);

  return {
    density,
    setDensity,
  };
}
