"use client";

import { useUi } from "@/components/i18n/use-ui";
import { Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const PHONE_WIDTH = 430;
const PHONE_HEIGHT = 714;

export default function InstagramPhoneFrame({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [time, setTime] = useState("9:41");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    };
    updateTime();
    const timer = window.setInterval(updateTime, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const fitPhone = () => {
      const nextScale = Math.min(host.clientWidth / PHONE_WIDTH, host.clientHeight / PHONE_HEIGHT, 1);
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };
    const observer = new ResizeObserver(fitPhone);
    observer.observe(host);
    fitPhone();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
      <div className="relative shrink-0" style={{ width: PHONE_WIDTH * scale, height: PHONE_HEIGHT * scale }}>
        <div
          className="absolute left-0 top-0 h-[714px] w-[430px] origin-top-left rounded-[3.25rem] bg-[#171b24] p-3 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.65)] ring-1 ring-black/20 dark:ring-white/10"
          style={{ transform: `scale(${scale})` }}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[2.55rem] bg-[#0e0e0f] text-white">
            <PhoneStatus time={time} />
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneStatus({ time }: { time: string }) {
  const tr = useUi();
  return (
    <div dir="ltr" className="relative flex h-11 shrink-0 items-center justify-between px-7 text-[12px] font-black">
      <span className="min-w-12 tabular-nums">{time}</span>
      <span className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
      <span className="flex items-center gap-1.5" aria-label={tr("Full signal, Wi-Fi connected, battery full")}>
        <span className="flex items-end gap-px" aria-hidden="true">
          {[5, 8, 11, 14].map((height) => <i key={height} className="w-[3px] rounded-sm bg-white" style={{ height }} />)}
        </span>
        <Wifi className="h-[15px] w-[15px]" strokeWidth={2.8} aria-hidden="true" />
        <span className="relative h-[11px] w-[22px] rounded-[3px] border border-white/90 p-[1px]" aria-hidden="true">
          <i className="block h-full w-full rounded-[1px] bg-white" />
          <i className="absolute -right-[3px] top-[3px] h-[5px] w-[2px] rounded-r bg-white/80" />
        </span>
      </span>
    </div>
  );
}
