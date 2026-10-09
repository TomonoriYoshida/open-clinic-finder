"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { maintenanceQueryKey } from "@/lib/api/queries";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => {
      const client: QueryClient = new QueryClient({
        // A 503 from any query means maintenance started after the page loaded: show the notice now.
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status === 503) {
              client.setQueryData(maintenanceQueryKey, true);
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            // Only retry network failures and server errors; 404/422/429 won't
            // change on retry, retrying 429 would only extend the limit, and
            // 503 is maintenance, which lasts minutes.
            retry: (failureCount, error) =>
              failureCount < 2 &&
              error instanceof ApiError &&
              (error.status === 0 || (error.status >= 500 && error.status !== 503)),
          },
        },
      });
      return client;
    },
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
