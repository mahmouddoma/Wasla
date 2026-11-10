/** Resolve only requests belonging to the configured backend origin and path boundary. */
export function backendRequestUrl(requestUrl: string, apiBaseUrl: string): URL | null {
  try {
    const base = new URL(apiBaseUrl);
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) return null;
    const url = new URL(
      requestUrl,
      typeof document !== 'undefined' ? document.baseURI : base.origin,
    );
    if (url.origin !== base.origin || url.username || url.password) return null;
    const prefix = base.pathname.replace(/\/+$/, '');
    if (prefix && url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return null;
    return url;
  } catch {
    return null;
  }
}
