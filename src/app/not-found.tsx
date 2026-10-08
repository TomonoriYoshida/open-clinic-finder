import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ページが見つかりません",
};

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <h1 className="text-xl font-bold">ページが見つかりません</h1>
      <Link href="/" className="mt-6 inline-block rounded-full border border-accent px-5 py-2 font-bold text-accent hover:bg-band">
        トップに戻る
      </Link>
    </div>
  );
}
