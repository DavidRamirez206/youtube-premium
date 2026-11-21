// Hide Shorts: removes Shorts shelves, Shorts tiles and the Shorts entry of
// the side menu from YouTube TV API responses before the app renders them.

import { configRead } from '../core/config';

type Json = Record<string, any>;

const SHORTS_SHELF = 'TVHTML5_SHELF_RENDERER_TYPE_SHORTS';
const SHORT_LOCKUP = 'LOCKUP_CONTENT_TYPE_SHORT';

/** Whether a list item is a Shorts tile, shelf or menu entry. */
export function isShortsItem(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const node = item as Json;

  if (node.shelfRenderer?.tvhtml5ShelfRendererType === SHORTS_SHELF) {
    return true;
  }
  if (node.reelItemRenderer || node.shortsLockupViewModel) return true;

  const lockup = node.lockupViewModel;
  if (lockup) {
    if (lockup.contentType === SHORT_LOCKUP) return true;
    const tap = lockup.rendererContext?.commandContext?.onTap;
    if (tap?.innertubeCommand?.reelWatchEndpoint) return true;
  }

  if (node.tileRenderer?.onSelectCommand?.reelWatchEndpoint) return true;
  if (node.guideEntryRenderer?.navigationEndpoint?.reelWatchEndpoint) {
    return true;
  }
  return false;
}

/** A shelf whose list became empty after removing Shorts from it. */
function isEmptyShelf(item: unknown): boolean {
  const shelf = (item as Json | null)?.shelfRenderer;
  if (!shelf) return false;
  const list = shelf.content?.horizontalListRenderer;
  return Array.isArray(list?.items) && list.items.length === 0;
}

/**
 * Removes Shorts from every list in `data`, in place. Returns the number of
 * items removed.
 */
export function removeShorts(data: unknown): number {
  let removed = 0;

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        if (isShortsItem(value[i])) {
          value.splice(i, 1);
          removed++;
          continue;
        }
        visit(value[i]);
        if (isEmptyShelf(value[i])) {
          value.splice(i, 1);
        }
      }
      return;
    }

    for (const key in value) {
      visit((value as Json)[key]);
    }
  };

  visit(data);
  return removed;
}

const originalParse = JSON.parse;

JSON.parse = function parse(this: unknown, ...args: Parameters<JSON['parse']>) {
  const result = originalParse.apply(this, args);
  if (result && typeof result === 'object' && configRead('removeShorts')) {
    try {
      removeShorts(result);
    } catch (e) {
      console.warn('[shorts] filter failed', e);
    }
  }
  return result;
} as JSON['parse'];
