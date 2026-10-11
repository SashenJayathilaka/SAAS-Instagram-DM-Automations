"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getInstagramAvatarFallbackInitial } from "@/lib/instagram-avatar";

type InstagramAvatarProps = {
  src?: string | null;
  username?: string | null;
  label?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClass = {
  sm: "h-10 w-10 rounded-full text-xs",
  md: "h-12 w-12 rounded-full text-xs",
  lg: "h-14 w-14 rounded-full text-sm",
  xl: "h-24 w-24 rounded-3xl text-base",
};

export default function InstagramAvatar({
  src,
  username,
  label,
  size = "md",
  className,
}: InstagramAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const safeSrc = typeof src === "string" && src.trim() ? src.trim() : null;
  const showImage = Boolean(safeSrc && !imageFailed);
  const fallback = getInstagramAvatarFallbackInitial(username, label);
  const baseClass = cn(
    "shrink-0 overflow-hidden shadow-sm ring-1 ring-white/60 dark:ring-white/10",
    sizeClass[size],
    className
  );

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safeSrc ?? undefined}
        alt={username ? `@${username}` : label ?? "Instagram account"}
        className={cn(baseClass, "bg-slate-100 object-cover dark:bg-white/[0.06]")}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      aria-label={username ? `@${username}` : label ?? "Instagram account"}
      className={cn(
        baseClass,
        "grid place-items-center bg-ap3k-gradient font-black text-white"
      )}
    >
      {fallback}
    </div>
  );
}
