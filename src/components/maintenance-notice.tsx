"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useMaintenance } from "@/lib/api/queries";

/** Shown above every page's content while the API is down for maintenance. */
export default function MaintenanceNotice() {
  const { data: isUnderMaintenance = false } = useMaintenance();
  const queryClient = useQueryClient();
  const wasUnderMaintenance = useRef(false);

  // Once maintenance ends, reload what failed during it instead of leaving the error on screen.
  useEffect(() => {
    if (wasUnderMaintenance.current && !isUnderMaintenance) {
      queryClient.refetchQueries({ predicate: (query) => query.state.status === "error" });
    }
    wasUnderMaintenance.current = isUnderMaintenance;
  }, [isUnderMaintenance, queryClient]);

  if (!isUnderMaintenance) {
    return null;
  }

  return (
    <div role="status" className="mb-5 rounded-xl border border-warning-border bg-warning-surface px-4 py-3 leading-relaxed">
      <p className="flex items-center gap-2 font-bold text-warning">
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 flex-none fill-current">
          <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm-.9 2.6h1.8v5h-1.8v-5Zm0 6.3h1.8v1.8h-1.8v-1.8Z" />
        </svg>
        ただいまメンテナンス中です
      </p>
      <p className="mt-1">病院・薬局の検索を一時的に止めています。終わると自動で使えるようになります。</p>
    </div>
  );
}
