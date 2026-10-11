"use client";

import { updateTimeZonePreference } from "@/actions/time-zone";
import { detectedTimeZone, FALLBACK_TIME_ZONE, isValidTimeZone } from "@/lib/time-zone";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type TimeZoneContextValue = {
  timeZone: string;
  automatic: boolean;
  detected: string;
  save: (timeZone: string, automatic: boolean) => Promise<void>;
};

const TimeZoneContext = createContext<TimeZoneContextValue | null>(null);

export function TimeZoneProvider({
  children,
  initialTimeZone,
  initialAutomatic,
}: {
  children: ReactNode;
  initialTimeZone?: string | null;
  initialAutomatic?: boolean;
}) {
  const automatic = initialAutomatic !== false;
  const initialZone = isValidTimeZone(initialTimeZone) ? initialTimeZone : FALLBACK_TIME_ZONE;
  const [browserZone, setBrowserZone] = useState(initialZone);
  const [detectionReady, setDetectionReady] = useState(false);
  const [preference, setPreference] = useState({
    timeZone: initialZone,
    automatic,
  });
  const synced = useRef(false);

  useEffect(() => {
    setBrowserZone(detectedTimeZone());
    setDetectionReady(true);
  }, []);

  useEffect(() => {
    if (!detectionReady || synced.current || !automatic || initialTimeZone === browserZone) return;
    synced.current = true;
    void updateTimeZonePreference({ timeZone: browserZone, automatic: true }).catch(() => {
      synced.current = false;
    });
  }, [automatic, browserZone, detectionReady, initialTimeZone]);

  const save = useCallback(async (timeZone: string, useAutomatic: boolean) => {
    const next = useAutomatic ? detectedTimeZone() : timeZone;
    if (!isValidTimeZone(next)) throw new Error("Choose a valid time zone.");
    await updateTimeZonePreference({ timeZone: next, automatic: useAutomatic });
    setPreference({ timeZone: next, automatic: useAutomatic });
  }, []);

  const value = useMemo(() => ({
    timeZone: preference.automatic ? browserZone : preference.timeZone,
    automatic: preference.automatic,
    detected: browserZone,
    save,
  }), [browserZone, preference, save]);

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}

export function useTimeZone() {
  const value = useContext(TimeZoneContext);
  if (value) return value;
  const detected = detectedTimeZone();
  return { timeZone: detected, detected, automatic: true, save: async () => undefined };
}
