// Pure URL helpers for the Tizen loader. Kept free of side effects so they
// can be unit tested.

export const YOUTUBE_ORIGIN = 'https://www.youtube.com';

const SINGLE_LABEL_HOST = /^https?:\/\/([\w-]+)(?=[/?#]|$)/i;

const PASSTHROUGH = /^(?:https?|file|data|blob):/i;

/**
 * Normalises URLs that YouTube TV builds while running from `file://`.
 *
 * YouTube derives hosts from `location.host`, which is empty on `file://`,
 * so it produces URLs such as `https:///youtubei/...`,
 * `https://youtubei/...` (the same URL once parsed),
 * `https://api/lounge/...` or URL-encoded variants appended to `file://`.
 * Relative URLs are resolved against youtube.com.
 */
export function fixYouTubeUrl(url: string): string {
  if (!url) return url;

  let out = url
    .replace(/^(https?):\/\/\/+/i, `${YOUTUBE_ORIGIN}/`)
    .replace(/^file:\/\/https?%3a\/\/\//i, `${YOUTUBE_ORIGIN}/`)
    // After URL parsing, `https:///youtubei/x` becomes host `youtubei`, and
    // `api/lounge` is built as `https://api/lounge`. Single-label hosts are
    // never real servers here, so move the label back into the path.
    .replace(SINGLE_LABEL_HOST, (_m, label: string) =>
      label.toLowerCase() === 'localhost' ? _m : `${YOUTUBE_ORIGIN}/${label}`
    );

  if (!PASSTHROUGH.test(out)) {
    out = new URL(out, `${YOUTUBE_ORIGIN}/`).toString();
  }
  return out;
}

/**
 * Directory of the running app (`file:///.../`), ignoring query and hash.
 * `index.html#/` must not be mistaken for a directory.
 */
export function localAppBase(href: string): string {
  const path = href.split(/[?#]/)[0] ?? '';
  return path.substring(0, path.lastIndexOf('/') + 1);
}

/** Local app URL (no query, no hash). */
export function localAppUrl(href: string): string {
  return href.split(/[?#]/)[0] ?? '';
}

/**
 * Query string for the local page, built from the YouTube launch URL.
 * YouTube reads launch options from `location.search`, and
 * `env_hideWatermark` suppresses the "NO DEBUG ACCESS" watermark shown
 * when it runs outside youtube.com.
 */
export function buildLocalSearch(targetUrl: URL): string {
  const params = new URLSearchParams(targetUrl.search);
  params.set('env_hideWatermark', '1');
  return `?${params.toString()}`;
}

/**
 * Whether a navigation to `url` is YouTube trying to reload itself.
 * Because of `<base href="https://www.youtube.com/">`, a reload to
 * `index.html?...` resolves to youtube.com and would 404.
 */
export function isAppReloadNavigation(url: URL): boolean {
  return (
    url.origin === YOUTUBE_ORIGIN &&
    /^\/(?:index\.html|tv\/?)?$/.test(url.pathname)
  );
}
