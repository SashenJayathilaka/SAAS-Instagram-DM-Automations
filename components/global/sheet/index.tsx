"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet as ShadcnSheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  trigger: React.ReactNode;
  triggerLabel: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: "left" | "right";
  closeOnNavigation?: boolean;
};

function Sheet({
  trigger,
  triggerLabel,
  children,
  className,
  contentClassName,
  side,
  closeOnNavigation = false,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (closeOnNavigation) {
      setOpen(false);
    }
  }, [pathname, closeOnNavigation]);

  return (
    <ShadcnSheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={triggerLabel}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {trigger}
      </SheetTrigger>
      {/* Navigation must release its modal layer as soon as it closes. */}
      {(!closeOnNavigation || open) && <SheetContent
        side={side}
        aria-describedby={undefined}
        className={cn("overflow-x-hidden p-0", contentClassName)}
        onClickCapture={(event) => {
          if (
            closeOnNavigation &&
            event.target instanceof Element &&
            event.target.closest("a[href]")
          ) {
            setOpen(false);
          }
        }}
      >
        <SheetTitle className="sr-only">{triggerLabel}</SheetTitle>
        {children}
      </SheetContent>}
    </ShadcnSheet>
  );
}

export default Sheet;
