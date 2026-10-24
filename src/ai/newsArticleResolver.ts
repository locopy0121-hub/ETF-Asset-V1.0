/**
 * Publisher URL resolution from a fetched Google News article page.
 * Never guess a publisher URL from an RSS title or a Google News article identifier.
 */
const htmlEntity = (text: string): string => text
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));

const GOOGLE_HOST = /(^|\.)(?:google\.[a-z.]+|googleusercontent\.com)$/i;

export function isPublisherArticleUrl(raw: string): boolean {
  try {
    const url = new URL(htmlEntity(raw));
    return url.protocol === 'https:'
      && !url.username && !url.password
      && !GOOGLE_HOST.test(url.hostname)
      && !/(^|\.)(?:doubleclick\.net|googlesyndication\.com)$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function attr(tag: string, key: string): string {
  // key is only one of the fixed HTML attribute identifiers used below.
  const found = new RegExp('(?:^|\\s)' + key + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))', 'i').exec(tag);
  return htmlEntity(found?.[1] ?? found?.[2] ?? found?.[3] ?? '');
}

export function resolvePublisherUrl(html: string, fetchedUrl: string): string | null {
  if (isPublisherArticleUrl(fetchedUrl)) return fetchedUrl;
  const candidates: string[] = [];
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const nativeArticle = attr(tag, 'data-n-au');
    if (nativeArticle) candidates.push(nativeArticle);
  }
  for (const tag of html.match(/<(?:link|meta)\b[^>]*>/gi) ?? []) {
    const relation = attr(tag, 'rel').toLowerCase();
    const property = attr(tag, 'property').toLowerCase();
    if (relation === 'canonical') candidates.push(attr(tag, 'href'));
    if (property === 'og:url') candidates.push(attr(tag, 'content'));
  }
  for (const raw of candidates) {
    if (!isPublisherArticleUrl(raw)) continue;
    try { return new URL(raw).toString(); } catch { /* ignore malformed links */ }
  }
  return null;
}
