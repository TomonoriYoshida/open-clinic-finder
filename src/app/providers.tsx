"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            // Only retry network failures and server errors; 404/422/429 won't
            // change on retry, and retrying 429 would only extend the limit.
            retry: (failureCount, error) =>
              failureCount < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
