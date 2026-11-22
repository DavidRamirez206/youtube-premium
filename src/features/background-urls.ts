// Fixes background images whose address YouTube builds with the page's
// protocol. Its player gives some image addresses (such as the thumbnails
// shown while seeking) the protocol of the page, which in YouTube Premium is
// file://, so they point to file://i.ytimg.com/... and never load.
//
// The style properties cannot be hooked on this browser (they are not on
// the prototype), so changes to inline styles are watched instead. Only
// values that contain "file://" followed by a host name are touched.

import { guard } from '../core/safe';

const FILE_HOST_URL = /url\((['"]?)file:\/\/(?=[a-z0-9-]+\.[a-z0-9.-]+\/)/gi;

/** `value` with file://host/... addresses turned into https://host/... */
export function fixBackgroundUrl(value: string): string {
  return value.replace(FILE_HOST_URL, 'url($1https://');
}

export function fixElementBackground(element: Element) {
  const style = (element as HTMLElement).style;
  const value = style?.backgroundImage;
  if (!value || !value.includes('file://')) return;
  const fixed = fixBackgroundUrl(value);
  if (fixed !== value) style.backgroundImage = fixed;
}

export function installBackgroundUrlFix(root: Node = document.documentElement) {
  const observer = new MutationObserver(
    guard('background urls', (records: MutationRecord[]) => {
      for (const record of records) {
        if (record.target instanceof Element) {
          fixElementBackground(record.target);
        }
      }
    })
  );
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['style'],
    subtree: true
  });
  return observer;
}

installBackgroundUrlFix();
