import { useState, useEffect, useCallback } from 'react';

const SHUFFLE_INTERVAL_KEY = 'codeShuffleInterval';
const DEFAULT_SHUFFLE_INTERVAL_MS = 30000; // 30 seconds in milliseconds

export type TimeUnit = 'seconds' | 'minutes' | 'hours';

export const convertToMilliseconds = (value: number, unit: TimeUnit): number => {
  switch (unit) {
    case 'seconds':
      return value * 1000;
    case 'minutes':
      return value * 60 * 1000;
    case 'hours':
      return value * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
};

// Helper function to safely get initial interval from localStorage
const getInitialInterval = (): number => {
  if (typeof window === 'undefined') return DEFAULT_SHUFFLE_INTERVAL_MS;
  
  try {
    const saved = localStorage.getItem(SHUFFLE_INTERVAL_KEY);
    return saved ? Number(saved) : DEFAULT_SHUFFLE_INTERVAL_MS;
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return DEFAULT_SHUFFLE_INTERVAL_MS;
  }
};

export const useShuffleSettings = () => {
  const [isClient, setIsClient] = useState(false);
  
  // Initialize with default values that will be replaced on client-side
  const [shuffleInterval, setShuffleInterval] = useState<number>(DEFAULT_SHUFFLE_INTERVAL_MS);
  
  // Set initial values on client-side mount
  useEffect(() => {
    setIsClient(true);
    const interval = getInitialInterval();
    setShuffleInterval(interval);
    
    // Set initial time value and unit based on the interval
    if (interval >= 3600000) {
      setTimeValue(interval / 3600000);
      setTimeUnit('hours');
    } else if (interval >= 60000) {
      setTimeValue(interval / 60000);
      setTimeUnit('minutes');
    } else {
      setTimeValue(interval / 1000);
      setTimeUnit('seconds');
    }
  }, []);
  
  const [timeValue, setTimeValue] = useState<number>(() => {
    const interval = getInitialInterval();
    if (interval >= 3600000) return interval / 3600000; // hours
    if (interval >= 60000) return interval / 60000;    // minutes
    return interval / 1000;                            // seconds
  });
  
  const [timeUnit, setTimeUnit] = useState<TimeUnit>(() => {
    const interval = getInitialInterval();
    if (interval >= 3600000) return 'hours';
    if (interval >= 60000) return 'minutes';
    return 'seconds';
  });

  const saveShuffleInterval = useCallback((value: number, unit: TimeUnit) => {
    const ms = convertToMilliseconds(value, unit);
    setShuffleInterval(ms);
    
    // Update timeValue and timeUnit based on the new unit
    if (unit === 'hours') {
      setTimeValue(ms / 3600000);
    } else if (unit === 'minutes') {
      setTimeValue(ms / 60000);
    } else {
      setTimeValue(ms / 1000);
    }
    setTimeUnit(unit);
    
    // Save to localStorage
    if (isClient) {
      try {
        localStorage.setItem(SHUFFLE_INTERVAL_KEY, ms.toString());
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  }, [isClient]);

  return {
    shuffleInterval,
    timeValue,
    timeUnit,
    setTimeValue: useCallback((value: number) => {
      setTimeValue(value);
      saveShuffleInterval(value, timeUnit);
    }, [timeUnit, saveShuffleInterval]),
    setTimeUnit: useCallback((unit: TimeUnit) => {
      setTimeUnit(unit);
      saveShuffleInterval(timeValue, unit);
    }, [timeValue, saveShuffleInterval]),
    saveShuffleInterval,
  };
};
