import { appIcon } from "@/lib/app-icon";

// Rendered to out/apple-icon.png at build time; iOS rounds the corners itself.
export const dynamic = "force-static";

export function GET() {
  return appIcon(180);
}
