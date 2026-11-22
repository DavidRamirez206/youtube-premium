// Player requests are marked as inline playback (isInlinePlaybackNoAd) so
// YouTube does not answer with ads or fake buffering when ads are blocked.
// See https://iter.ca/post/yt-adblock/
//
// YouTube does not record inline playback in the watch history, so videos
// played from the watch page are left unmarked while "Save watch history"
// is on. Previews on other pages are always marked.

import { configRead } from '../core/config';
import { reportError } from '../core/safe';

const originalStringify = JSON.stringify;

/** Whether a player request should be marked as inline playback. */
export function shouldMarkInline(hash: string): boolean {
  if (!configRead('enableAdBlock')) return false;
  const onWatchPage = hash.startsWith('#/watch');
  return !(onWatchPage && configRead('saveWatchHistory'));
}

/** Marks `value` in place when it is a player request. */
export function markInlinePlayback(value: unknown, hash: string) {
  if (!value || typeof value !== 'object') return;
  const ctx = (
    value as { playbackContext?: { contentPlaybackContext?: unknown } }
  ).playbackContext?.contentPlaybackContext;
  if (!ctx || typeof ctx !== 'object') return;
  if (shouldMarkInline(hash)) {
    (ctx as Record<string, unknown>).isInlinePlaybackNoAd = true;
  }
}

function stringify(
  value: unknown,
  replacer?: Parameters<typeof JSON.stringify>[1],
  space?: string | number
): string {
  try {
    markInlinePlayback(value, window.location.hash);
  } catch (error) {
    reportError('JSON.stringify hook', error);
  }
  return originalStringify(value, replacer as never, space);
}

JSON.stringify = stringify as typeof JSON.stringify;
