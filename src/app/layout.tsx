import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/site-header";
import { apiDocsUrl } from "@/lib/api/client";
import { ogImage, siteDescription, siteName, siteUrl } from "@/lib/site";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  appleWebApp: {
    title: siteName,
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  // Shown when the URL is shared (Facebook, LINE, X, ...). No url: here, a
  // shared facility page would claim to be the top page; the top page sets it.
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: siteDescription,
    locale: "ja_JP",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">{children}</main>
          <footer className="border-t border-border bg-surface">
            <div className="mx-auto w-full max-w-2xl space-y-2 px-4 py-5 text-sm leading-relaxed text-muted">
              <p>
                施設は地方厚生局の「保険医療機関・保険薬局の指定一覧」、診療時間は厚生労働省「医療情報ネット」の公開情報です。臨時休診や最近の変更は反映されないことがあるため、受診の前に電話でご確認ください。
              </p>
              <p>
                個人が運営する非公式のサイトで、厚生労働省・地方厚生局とは関係ありません。予告なく内容を変更したり、公開を終了したりすることがあります。
              </p>
              <p>
                <a href={apiDocsUrl} className="underline underline-offset-2 hover:text-accent">
                  このデータを使いたい開発者の方へ（API）
                </a>
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
