import type { ReactNode } from "react";
import type { Attribution } from "@/lib/api/types";
import NewTabMark from "@/components/new-tab-mark";
import { safeExternalUrl } from "@/lib/url";

/**
 * The data license (公共データ利用規約 1.0) requires crediting the source
 * wherever the data is shown, so every data page renders the API's own
 * attribution block rather than a hard-coded copy.
 */
export default function AttributionNotice({ attribution }: { attribution: Attribution }) {
  return (
    <aside className="mt-10 border-t border-border pt-3 text-sm leading-relaxed text-muted">
      <p className="font-bold">データの出典</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        <li>{attribution.notice}</li>
        <li>
          ライセンス：
          <ExternalLink url={attribution.license.url}>{attribution.license.name}</ExternalLink>
        </li>
        <li>{attribution.disclaimer}</li>
        <li>
          市区町村・位置：
          <ExternalLink url={attribution.address_source.url}>{attribution.address_source.name}</ExternalLink>
          （CC BY 4.0）
        </li>
        <li>
          診療時間、位置（住所から町丁目までしか求められない施設）：
          <ExternalLink url={attribution.medical_info_net_source.url}>
            {attribution.medical_info_net_source.name}
          </ExternalLink>
          （{attribution.license.name}）
        </li>
      </ul>
      <details className="mt-1">
        <summary className="cursor-pointer py-3 text-accent">出典元（各地方厚生局）</summary>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 pl-5">
          {attribution.sources.map((source) => (
            <li key={source.url}>
              <ExternalLink url={source.url}>{source.bureau}</ExternalLink>
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}

/** The URLs come from the API, so anything but http(s) is shown as plain text. */
function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  const href = safeExternalUrl(url);
  if (!href) {
    return <span>{children}</span>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
      {children}
      <NewTabMark />
    </a>
  );
}
