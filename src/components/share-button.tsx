"use client";

import QRCode from "qrcode";
import { useRef, useState, useSyncExternalStore } from "react";
import { siteName } from "@/lib/site";

const noSubscription = () => () => {};

const buttonClass =
  "inline-flex items-center justify-center gap-1 rounded-full border border-accent px-4 py-2 text-sm font-bold text-accent hover:bg-band";

/**
 * Introduces the site to someone nearby (a QR code to scan) or far away (the
 * share sheet, or a copied link). Always the top page: the URL being looked
 * at may carry the visitor's own location.
 */
export default function ShareButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Known only in the browser; the prerendered HTML assumes no share sheet.
  const canShare = useSyncExternalStore(
    noSubscription,
    () => "share" in navigator,
    () => false,
  );

  async function open() {
    const url = `${window.location.origin}/`;
    setSiteUrl(url);
    setCopied(false);
    dialogRef.current?.showModal();
    setQrSvg(await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function download() {
    const link = document.createElement("a");
    link.href = await QRCode.toDataURL(siteUrl, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
    link.download = "qr-code.png";
    link.click();
  }

  return (
    <>
      <button type="button" onClick={open} className="rounded-full px-3 py-1.5 text-sm font-bold text-accent hover:bg-band">
        紹介する
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="share-title"
        // Closes when the backdrop (the dialog element itself) is tapped.
        onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
        className="m-auto w-[min(22rem,calc(100%-2rem))] rounded-2xl bg-background p-0 text-foreground backdrop:bg-black/50"
      >
        <div className="p-6 text-center">
          <h2 id="share-title" className="text-lg font-bold">
            {siteName}を紹介する
          </h2>
          <p className="mt-1 text-sm text-muted">スマートフォンのカメラで読み取ると開けます</p>
          <div className="mx-auto mt-4 aspect-square w-56 rounded-lg bg-white p-2">
            {qrSvg ? (
              // Generated here from this site's own URL, not from outside input.
              <div aria-label={`${siteUrl} のQRコード`} role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            ) : null}
          </div>
          <p className="mt-3 text-sm break-all text-muted">{siteUrl}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {canShare && (
              <button
                type="button"
                onClick={() => navigator.share({ title: siteName, url: siteUrl }).catch(() => undefined)}
                className={buttonClass}
              >
                共有
              </button>
            )}
            <button type="button" onClick={copy} className={buttonClass}>
              {copied ? "コピーしました" : "リンクをコピー"}
            </button>
            <button type="button" onClick={download} className={buttonClass}>
              QRを保存
            </button>
          </div>
          <form method="dialog" className="mt-5">
            <button className="text-sm text-muted underline underline-offset-2">閉じる</button>
          </form>
        </div>
      </dialog>
    </>
  );
}
