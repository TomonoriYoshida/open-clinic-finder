/**
 * Returns the URL only if it is an http(s) link, so a tampered API response
 * can't turn a link into data:, file: or other schemes. React already blocks
 * javascript: URLs, but not those.
 */
export function safeExternalUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
