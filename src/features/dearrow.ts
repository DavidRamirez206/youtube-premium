// DeArrow: replaces clickbait titles and thumbnails with ones submitted by
// the DeArrow community (https://dearrow.ajay.app). Data from the DeArrow
// API is licensed under CC BY-NC-SA 4.0.
//
// Titles are swapped synchronously while YouTube TV parses API responses,
// using a cache. Responses loaded with fetch() are held back briefly while
// the cache is filled, so the first view already shows the new titles;
// anything missed is fetched in the background for the next view.
//
// For privacy, the API is queried by the first 4 characters of the SHA-256
// hash of each video ID, never by the ID itself.

import sha256 from 'tiny-sha256';
import { configRead } from '../core/config';
import { FetchRegistry } from '../hooks';

type Json = Record<string, any>;

export const BRANDING_API = 'https://sponsor.ajay.app/api/branding/';
export const THUMBNAIL_API =
  'https://dearrow-thumb.ajay.app/api/v1/getThumbnail';

/** How long a response may be held back while DeArrow data loads. */
const PREFETCH_TIMEOUT_MS = 1500;
const VIDEO_ID = /^[\w-]{11}$/;
const API_PATHS = /^\/youtubei\/v1\/(?:browse|search|next)\b/;

interface BrandingTitle {
  title: string;
  original: boolean;
  votes: number;
  locked: boolean;
}

interface BrandingThumbnail {
  timestamp: number | null;
  original: boolean;
  votes: number;
  locked: boolean;
}

export interface Branding {
  titles?: BrandingTitle[];
  thumbnails?: BrandingThumbnail[];
}

export interface Replacement {
  title?: string;
  thumbnailTime?: number;
}

const isTrusted = (s: { votes: number; locked: boolean }) =>
  s.locked || s.votes >= 0;

/**
 * DeArrow marks words that must keep their case with a leading `>`; it is
 * not part of the title.
 */
export function cleanTitle(title: string) {
  return title.replace(/(^|\s)>(\S)/g, '$1$2').trim();
}

/** The community replacement for a video, if there is a trusted one. */
export function pickReplacement(branding: Branding | undefined): Replacement {
  const result: Replacement = {};
  const title = branding?.titles?.find((t) => !t.original && isTrusted(t));
  if (title) result.title = cleanTitle(title.title);

  const thumb = branding?.thumbnails?.find(
    (t) => !t.original && isTrusted(t) && typeof t.timestamp === 'number'
  );
  if (thumb) result.thumbnailTime = thumb.timestamp as number;
  return result;
}

export function thumbnailUrl(videoId: string, time: number) {
  return `${THUMBNAIL_API}?videoID=${encodeURIComponent(videoId)}&time=${time}`;
}

export const hashPrefix = (videoId: string): string =>
  sha256(videoId).substring(0, 4);

/** Video IDs of the tiles in an API response. */
export function collectVideoIds(data: unknown): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as Json;
    const id = videoIdOf(node);
    if (id) ids.add(id);
    for (const key in node) visit(node[key]);
  };
  visit(data);
  return [...ids];
}

function videoIdOf(node: Json): string | null {
  const lockup = node.lockupViewModel;
  if (
    lockup?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' &&
    VIDEO_ID.test(lockup.contentId)
  ) {
    return lockup.contentId;
  }
  const tile = node.tileRenderer;
  if (
    tile?.onSelectCommand?.watchEndpoint &&
    typeof tile.contentId === 'string' &&
    VIDEO_ID.test(tile.contentId)
  ) {
    return tile.contentId;
  }
  return null;
}

/**
 * Applies replacements to the tiles of an API response, in place. Returns
 * the number of tiles changed.
 */
export function applyBranding(
  data: unknown,
  lookup: (videoId: string) => Replacement | undefined,
  options: { thumbnails: boolean }
): number {
  let changed = 0;

  const setThumbnails = (images: unknown, videoId: string, time: number) => {
    if (!Array.isArray(images)) return;
    for (const image of images) {
      if (image && typeof image === 'object') {
        (image as Json).url = thumbnailUrl(videoId, time);
      }
    }
  };

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as Json;
    const id = videoIdOf(node);
    const replacement = id ? lookup(id) : undefined;

    if (
      id &&
      replacement &&
      (replacement.title || replacement.thumbnailTime !== undefined)
    ) {
      const time = options.thumbnails ? replacement.thumbnailTime : undefined;

      if (node.lockupViewModel) {
        const lockup = node.lockupViewModel;
        const title = lockup.metadata?.lockupMetadataViewModel?.title;
        if (replacement.title && title) title.content = replacement.title;
        if (time !== undefined) {
          setThumbnails(
            lockup.contentImage?.thumbnailViewModel?.image?.sources,
            id,
            time
          );
        }
      } else {
        const tile = node.tileRenderer;
        const title = tile.metadata?.tileMetadataRenderer?.title;
        if (replacement.title && title) {
          if ('runs' in title) title.runs = [{ text: replacement.title }];
          else title.simpleText = replacement.title;
        }
        if (time !== undefined) {
          setThumbnails(
            tile.header?.tileHeaderRenderer?.thumbnail?.thumbnails,
            id,
            time
          );
        }
      }
      changed++;
    }

    for (const key in node) visit(node[key]);
  };

  visit(data);
  return changed;
}

type FetchLike = (url: string) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

/** Cache of DeArrow data, loaded by hash prefix. */
export class BrandingCache {
  #entries = new Map<string, Replacement>();
  #prefixes = new Map<string, Promise<void>>();
  #fetch: FetchLike;

  constructor(fetchImpl: FetchLike) {
    this.#fetch = fetchImpl;
  }

  /** `undefined` while the video's prefix has not been loaded. */
  get(videoId: string): Replacement | undefined {
    return this.#entries.get(videoId);
  }

  /** Loads every prefix needed for `videoIds` that is not loaded yet. */
  load(videoIds: string[]): Promise<void> {
    const pending = new Map<string, string[]>();
    for (const id of videoIds) {
      if (this.#entries.has(id)) continue;
      const prefix = hashPrefix(id);
      const ids = pending.get(prefix) ?? [];
      ids.push(id);
      pending.set(prefix, ids);
    }

    const loads = [...pending].map(([prefix, ids]) => {
      let promise = this.#prefixes.get(prefix);
      if (!promise) {
        promise = this.#loadPrefix(prefix);
        this.#prefixes.set(prefix, promise);
      }
      // Videos without DeArrow data get an empty entry, so they are not
      // requested again.
      return promise.then(() => {
        for (const id of ids) {
          if (!this.#entries.has(id)) this.#entries.set(id, {});
        }
      });
    });
    return Promise.all(loads).then(() => undefined);
  }

  async #loadPrefix(prefix: string) {
    try {
      const res = await this.#fetch(BRANDING_API + prefix);
      if (!res.ok) throw new Error(`HTTP ${String(res.ok)}`);
      const data = (await res.json()) as Record<string, Branding>;
      for (const [id, branding] of Object.entries(data ?? {})) {
        this.#entries.set(id, pickReplacement(branding));
      }
    } catch (e) {
      // Allow a retry on a later response.
      this.#prefixes.delete(prefix);
      throw e;
    }
  }
}

/** Resolves when `promise` settles or after `ms`, whichever comes first. */
export function withTimeout(promise: Promise<unknown>, ms: number) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      }
    );
  });
}

const originalParse = JSON.parse;
const cache = new BrandingCache((url) => window.fetch(url));

const enabled = () => Boolean(configRead('enableDeArrow'));

export function brandResponse(data: unknown) {
  const ids = collectVideoIds(data);
  if (!ids.length) return;
  applyBranding(data, (id) => cache.get(id), {
    thumbnails: Boolean(configRead('enableDeArrowThumbnails'))
  });
  // Fill the cache for tiles seen for the first time.
  cache.load(ids).catch((e: unknown) => console.warn('[DeArrow]', e));
}

JSON.parse = function parse(this: unknown, ...args: Parameters<JSON['parse']>) {
  const result = originalParse.apply(this, args);
  if (result && typeof result === 'object' && enabled()) {
    try {
      brandResponse(result);
    } catch (e) {
      console.warn('[DeArrow] failed to apply titles', e);
    }
  }
  return result;
} as JSON['parse'];

FetchRegistry.getInstance().waitBeforeResponse(async (url, response) => {
  if (!enabled() || !API_PATHS.test(url.pathname)) return;
  const text = await response.clone().text();
  const ids = collectVideoIds(originalParse(text));
  if (ids.length) await withTimeout(cache.load(ids), PREFETCH_TIMEOUT_MS);
});
