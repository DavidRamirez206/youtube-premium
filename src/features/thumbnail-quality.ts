const webpTestImgs = {
  lossy: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  lossless: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
  alpha:
    'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==',
  animation:
    'UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA'
} as const;

function checkWebpFeature(
  feature: keyof typeof webpTestImgs,
  callback: (
    featureName: keyof typeof webpTestImgs,
    isSupported: boolean
  ) => void
) {
  const img = new Image();
  img.onload = function () {
    const result = img.width > 0 && img.height > 0;
    callback(feature, result);
  };

  img.onerror = function () {
    callback(feature, false);
  };

  img.src = 'data:image/webp;base64,' + webpTestImgs[feature];
}

let webpSupported = false;
checkWebpFeature('lossy', (_, support) => {
  webpSupported = support;
});

function rewriteURL(url: URL) {
  const YT_THUMBNAIL_PATHNAME_REGEX =
    /vi(?:_webp)?(\/.*?\/)([a-z0-9]+)(_\w*)?\.[a-z]+$/g;

  const YT_TARGET_THUMBNAIL_NAMES = [
    'sddefault',
    'hqdefault',
    'mqdefault',
    'default'
  ] as const;

  const isABTest = url.hostname.match(/^i\d/) !== null;
  // Don't know how to handle A/B test thumbnails so we don't upgrade them.
  if (isABTest) return null;

  const replacementPathname = url.pathname.replace(
    YT_THUMBNAIL_PATHNAME_REGEX,
    (match, p1, p2, p3) => {
      if (!YT_TARGET_THUMBNAIL_NAMES.includes(p2)) return match; // Only rewrite regular thumbnail URLs. Not shorts, etc.
      return `${webpSupported ? 'vi_webp' : 'vi'}${p1}sddefault${p3 ?? ''}.${webpSupported ? 'webp' : 'jpg'}`;
    }
  );
  if (url.pathname === replacementPathname)
    // pathname not changed because not a regular thumbnail or already upgraded.
    return null;

  url = new URL(url);

  url.pathname = replacementPathname;
  url.search = '';

  return url;
}

function parseCSSUrl(value: string): URL | undefined {
  try {
    return new URL(value.slice(4, -1).replace(/["']/g, ''));
  } catch {
    return undefined; // Not a valid URL
  }
}

async function upgradeBgImg(element: HTMLElement) {
  // Watch page uses storyboard/preview assets for scrubbing.
  // Rewriting these can break preview rendering on Tizen.
  if (
    document.body?.classList.contains('WEB_PAGE_TYPE_WATCH') ||
    window.location.hash.includes('/watch') ||
    window.location.pathname.includes('/watch') ||
    element.closest('ytlr-watch-default') ||
    element.closest('.ytp-storyboard') ||
    element.closest('.ytp-tooltip') ||
    element.closest('ytlr-preview-thumbnail') ||
    element.closest('[idomkey="preview"]')
  ) {
    return;
  }

  const style = element.style;
  const old = parseCSSUrl(style.backgroundImage);
  if (!old) return;

  const target = rewriteURL(old);
  if (!target) return;

  const lazyLoader = new Image();

  lazyLoader.onload = () => {
    // Don't swap if a placeholder thumbnail was provided.
    // Placeholder thumbnails are the same size as the "default" size.
    if (lazyLoader.naturalHeight === 90) return;

    const curr = parseCSSUrl(style.backgroundImage);
    if (!curr) return;

    // Don't swap out element image if it has been changed while target image was loading.
    if (curr.href !== old.href) return;

    style.backgroundImage = `url(${target.href})`;
  };

  lazyLoader.src = target.href;
}

const YT_THUMBNAIL_TAG = 'YTLR-THUMBNAIL-DETAILS';

function isWatchPage() {
  return (
    window.location.hash.includes('/watch') ||
    !!document.body?.classList.contains('WEB_PAGE_TYPE_WATCH')
  );
}

const CSS_URL = /url\((['"]?)(.*?)\1\)/;

/** Address inside the first url(...) of a style, without parsing CSS. */
export function backgroundUrlOf(css: string | null | undefined): string {
  if (!css) return '';
  return CSS_URL.exec(css)?.[2] ?? '';
}

/**
 * Upgrades thumbnails that were added or whose image changed (YouTube
 * reuses thumbnail elements in its virtual lists). Runs for every style
 * change on the page, so cheap checks come first: nothing is done on the
 * watch page, where the progress bar changes its style many times per
 * second, or for elements that are not thumbnails.
 */
export function handleMutations(mutations: MutationRecord[]) {
  if (isWatchPage()) return;

  for (const mut of mutations) {
    if (mut.type === 'attributes') {
      const node = mut.target;
      if (
        node instanceof HTMLElement &&
        node.tagName === YT_THUMBNAIL_TAG &&
        node.style.backgroundImage !== '' &&
        backgroundUrlOf(node.style.backgroundImage) !==
          backgroundUrlOf(mut.oldValue)
      ) {
        void upgradeBgImg(node);
      }
    } else if (mut.type === 'childList') {
      for (const added of Array.from(mut.addedNodes)) {
        if (!(added instanceof HTMLElement)) continue;
        const thumbs =
          added.tagName === YT_THUMBNAIL_TAG
            ? [added]
            : Array.from(
                added.getElementsByTagName(YT_THUMBNAIL_TAG.toLowerCase())
              );
        for (const elem of thumbs) {
          if (elem instanceof HTMLElement && elem.style.backgroundImage) {
            void upgradeBgImg(elem);
          }
        }
      }
    }
  }
}

const obs = new MutationObserver(handleMutations);

function enableObserver() {
  const startObs = () => {
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style'],
      attributeOldValue: true
    });
  };

  if (document.body) {
    startObs();
  } else {
    document.addEventListener('DOMContentLoaded', startObs);
  }
}

import { configRead, configAddChangeListener } from '../core/config';

if (configRead('upgradeThumbnails')) enableObserver();

configAddChangeListener('upgradeThumbnails', (evt) =>
  (evt as CustomEvent<{ newValue: boolean }>).detail.newValue
    ? enableObserver()
    : obs.disconnect()
);
