import { appIcon } from "@/lib/app-icon";

// Rendered to out/icon-192.png at build time.
export const dynamic = "force-static";

export function GET() {
  return appIcon(192);
}
