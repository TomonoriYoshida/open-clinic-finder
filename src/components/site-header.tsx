import Link from "next/link";
import { siteName } from "@/lib/site";
import ShareButton from "./share-button";

export default function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-brand text-lg leading-none text-white">
            ＋
          </span>
          {siteName}
        </Link>
        <ShareButton />
      </div>
    </header>
  );
}
