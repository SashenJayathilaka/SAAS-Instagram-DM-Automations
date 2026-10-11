"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";

type Props = {
  children: React.ReactNode;
};

function ReactQueryProvider({ children }: Props) {
  // One client per component mount, never shared across users
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // No default staleTime — always treat server data as potentially stale
            // so a user switch triggers fresh fetches rather than serving cached data
            staleTime: 0,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default ReactQueryProvider;
