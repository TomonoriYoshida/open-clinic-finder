import { appIcon } from "@/lib/app-icon";

// Rendered to out/icon-512.png at build time.
export const dynamic = "force-static";

export function GET() {
  return appIcon(512);
}
