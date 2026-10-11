"use client";

import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Clears the React Query cache whenever the authenticated Clerk user changes.
 * Prevents stale data from a previous user session bleeding into a new session
 * when account switches happen via Clerk redirect rather than the sign-out button.
 *
 * Must be rendered inside both ClerkProvider and QueryClientProvider.
 */
export function ClerkCacheSyncer() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const prevUserId = useRef<string | null | undefined>(userId);

  useEffect(() => {
    if (prevUserId.current !== undefined && prevUserId.current !== userId) {
      console.log("[tenant] auth user changed — clearing React Query cache", {
        from: prevUserId.current ? "[redacted]" : null,
        to: userId ? "[redacted]" : null,
      });
      queryClient.clear();
    }
    prevUserId.current = userId;
  }, [userId, queryClient]);

  return null;
}
