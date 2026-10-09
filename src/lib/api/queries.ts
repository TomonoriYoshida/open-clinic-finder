import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient, apiOrigin, unwrap } from "./client";
import type { FacilityListQuery, FacilityPage } from "./types";

export const maintenanceQueryKey = ["maintenance"] as const;

/**
 * Whether the API is down for maintenance (503). Asked once per page load,
 * then every minute while it is, so the notice goes away on its own. A
 * failure to connect is not maintenance: the queries report that themselves.
 */
export function useMaintenance() {
  return useQuery({
    queryKey: maintenanceQueryKey,
    queryFn: async () => {
      try {
        // /options is the cheapest endpoint; no-store, since it is otherwise cached for a day.
        const response = await fetch(`${apiOrigin}/api/v1/options`, { cache: "no-store" });
        return response.status === 503;
      } catch {
        return false;
      }
    },
    staleTime: Infinity,
    retry: false,
    refetchInterval: (query) => (query.state.data ? 60 * 1000 : false),
  });
}

export function useOptions() {
  return useQuery({
    queryKey: ["options"],
    queryFn: async () => (await unwrap(apiClient.GET("/v1/options"))).data,
    // The API marks /options as cacheable for a day; it only changes on deploy.
    staleTime: 24 * 60 * 60 * 1000,
  });
}

/**
 * The facility list comes back in page-number form unless pagination=cursor
 * is asked for, which this site never does; checked rather than assumed.
 */
function numberedPage(page: FacilityPage | { meta: object }): FacilityPage {
  if (!("last_page" in page.meta)) {
    throw new Error("Expected a page-numbered facility list.");
  }
  return page as FacilityPage;
}

export function useFacilities(query: FacilityListQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["facilities", query],
    enabled,
    queryFn: async () => numberedPage(await unwrap(apiClient.GET("/v1/medical-facilities", { params: { query } }))),
    placeholderData: keepPreviousData,
  });
}

export function useFacility(id: number | null) {
  return useQuery({
    queryKey: ["facility", id],
    enabled: id !== null,
    queryFn: () =>
      unwrap(
        apiClient.GET("/v1/medical-facilities/{medicalFacility}", {
          params: { path: { medicalFacility: id! } },
        }),
      ),
  });
}

export function useFacilityOpeningHours(id: number | null) {
  return useQuery({
    queryKey: ["facility-opening-hours", id],
    enabled: id !== null,
    queryFn: async () =>
      (
        await unwrap(
          apiClient.GET("/v1/medical-facilities/{medicalFacility}/opening-hours", {
            params: { path: { medicalFacility: id! } },
          }),
        )
      ).data,
    // From a source updated twice a year; the API marks it cacheable for an hour.
    staleTime: 60 * 60 * 1000,
  });
}
