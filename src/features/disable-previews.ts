// Disable autoplay previews: YouTube TV starts a muted preview when a tile
// stays focused. The tile learns how to do that from a
// startInlinePlaybackCommand in its onFocusCommand, which is stripped from
// API responses here. Any preview that still starts is stopped.

import { configRead } from '../core/config';
import { getPlayerManager, PlayerMode } from '../player_api';
import type { YTPlayer } from '../player_api';

const PREVIEW_COMMAND = 'startInlinePlaybackCommand';

/** Only tracking data is left once the preview command is removed. */
function isEmptyCommand(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value).every((k) => k === 'clickTrackingParams');
}

/**
 * Removes every preview command from `data`, in place. Returns the number
 * of commands removed.
 */
export function stripPreviewCommands(data: unknown): number {
  let removed = 0;

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        const before = removed;
        visit(value[i]);
        if (removed > before && isEmptyCommand(value[i])) value.splice(i, 1);
      }
      return;
    }

    const node = value as Record<string, unknown>;
    if (PREVIEW_COMMAND in node) {
      delete node[PREVIEW_COMMAND];
      removed++;
    }
    for (const key of Object.keys(node)) {
      const before = removed;
      visit(node[key]);
      if (removed > before && isEmptyCommand(node[key])) delete node[key];
    }
  };

  visit(data);
  return removed;
}

const originalParse = JSON.parse;

JSON.parse = function parse(this: unknown, ...args: Parameters<JSON['parse']>) {
  const result = originalParse.apply(this, args);
  if (result && typeof result === 'object' && configRead('disablePreviews')) {
    try {
      stripPreviewCommands(result);
    } catch (e) {
      console.warn('[previews] filter failed', e);
    }
  }
  return result;
} as JSON['parse'];

interface PreviewTarget {
  readonly player: YTPlayer;
  readonly playerMode: PlayerMode;
  addEventListener(type: 'playbackStart', cb: () => void): void;
}

/** Stops previews that start despite the filter (e.g. the home banner). */
export function installPreviewStopper(manager: PreviewTarget) {
  manager.addEventListener('playbackStart', () => {
    if (!configRead('disablePreviews')) return;
    if (manager.playerMode !== PlayerMode.PREVIEW) return;
    try {
      if (manager.player.stopVideo) manager.player.stopVideo();
      else manager.player.pauseVideo?.();
    } catch (e) {
      console.warn('[previews] could not stop preview', e);
    }
  });
}

void getPlayerManager().then((manager) => installPreviewStopper(manager));
