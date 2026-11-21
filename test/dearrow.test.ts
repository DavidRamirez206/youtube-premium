import { describe, expect, it, vi } from 'vitest';
import {
  applyBranding,
  BRANDING_API,
  BrandingCache,
  cleanTitle,
  collectVideoIds,
  hashPrefix,
  pickReplacement,
  thumbnailUrl,
  withTimeout
} from '../src/features/dearrow';

const ID = 'dQw4w9WgXcQ';

const lockup = (id: string, type = 'LOCKUP_CONTENT_TYPE_VIDEO') => ({
  lockupViewModel: {
    contentId: id,
    contentType: type,
    metadata: {
      lockupMetadataViewModel: { title: { content: "YOU WON'T BELIEVE" } }
    },
    contentImage: {
      thumbnailViewModel: {
        image: { sources: [{ url: 'https://i.ytimg.com/vi/x/hq.jpg' }] }
      }
    }
  }
});

const tile = (id: string) => ({
  tileRenderer: {
    contentId: id,
    onSelectCommand: { watchEndpoint: { videoId: id } },
    metadata: { tileMetadataRenderer: { title: { simpleText: 'CLICK' } } },
    header: {
      tileHeaderRenderer: {
        thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/x/hq.jpg' }] }
      }
    }
  }
});

const title = (t: string, extra = {}) => ({
  title: t,
  original: false,
  votes: 0,
  locked: false,
  ...extra
});

describe('pickReplacement', () => {
  it('uses the first trusted community title and thumbnail', () => {
    expect(
      pickReplacement({
        titles: [
          title('Downvoted', { votes: -1 }),
          title('Never Gonna Give You Up')
        ],
        thumbnails: [
          { timestamp: null, original: true, votes: 9, locked: false },
          { timestamp: 3.5, original: false, votes: 1, locked: false }
        ]
      })
    ).toEqual({ title: 'Never Gonna Give You Up', thumbnailTime: 3.5 });
  });

  it('accepts locked submissions with negative votes', () => {
    expect(
      pickReplacement({
        titles: [title('Locked', { votes: -2, locked: true })]
      })
    ).toEqual({ title: 'Locked' });
  });

  it('ignores the original title and missing data', () => {
    expect(
      pickReplacement({ titles: [title('Original', { original: true })] })
    ).toEqual({});
    expect(pickReplacement(undefined)).toEqual({});
  });
});

it('cleanTitle removes DeArrow case markers', () => {
  expect(cleanTitle('>iPhone review of >macOS')).toBe('iPhone review of macOS');
  expect(cleanTitle('5 > 3')).toBe('5 > 3');
});

describe('collectVideoIds', () => {
  it('finds videos in lockups and tiles, not Shorts or playlists', () => {
    const data = {
      items: [
        lockup('aaaaaaaaaaa'),
        lockup('bbbbbbbbbbb', 'LOCKUP_CONTENT_TYPE_SHORT'),
        lockup('PLxxxxxxxxxxxx', 'LOCKUP_CONTENT_TYPE_PLAYLIST'),
        { nested: [tile('ccccccccccc')] }
      ]
    };
    expect(collectVideoIds(data)).toEqual(['aaaaaaaaaaa', 'ccccccccccc']);
  });
});

describe('applyBranding', () => {
  const lookup = () => ({ title: 'Honest title', thumbnailTime: 12 });

  it('replaces titles and thumbnails of lockups', () => {
    const data = { items: [lockup(ID)] };
    expect(applyBranding(data, lookup, { thumbnails: true })).toBe(1);
    const vm = data.items[0]!.lockupViewModel;
    expect(vm.metadata.lockupMetadataViewModel.title.content).toBe(
      'Honest title'
    );
    expect(vm.contentImage.thumbnailViewModel.image.sources[0]!.url).toBe(
      thumbnailUrl(ID, 12)
    );
  });

  it('replaces titles of legacy tiles and keeps thumbnails when disabled', () => {
    const data = { items: [tile(ID)] };
    applyBranding(data, lookup, { thumbnails: false });
    const r = data.items[0]!.tileRenderer;
    expect(r.metadata.tileMetadataRenderer.title.simpleText).toBe(
      'Honest title'
    );
    expect(r.header.tileHeaderRenderer.thumbnail.thumbnails[0]!.url).toContain(
      'i.ytimg.com'
    );
  });

  it('leaves videos without DeArrow data untouched', () => {
    const data = { items: [lockup(ID)] };
    expect(applyBranding(data, () => undefined, { thumbnails: true })).toBe(0);
    expect(applyBranding(data, () => ({}), { thumbnails: true })).toBe(0);
  });
});

describe('BrandingCache', () => {
  const api = (body: unknown, ok = true) =>
    vi.fn(async (_url: string) => ({ ok, json: async () => body }));

  it('queries by hash prefix, never by video ID', async () => {
    const fetchImpl = api({ [ID]: { titles: [title('Honest')] } });
    const cache = new BrandingCache(fetchImpl);
    await cache.load([ID]);
    expect(fetchImpl).toHaveBeenCalledWith(BRANDING_API + hashPrefix(ID));
    expect(fetchImpl.mock.calls[0]![0]).not.toContain(ID);
    expect(hashPrefix(ID)).toMatch(/^[0-9a-f]{4}$/);
    expect(cache.get(ID)).toEqual({ title: 'Honest' });
  });

  it('loads each prefix once and remembers videos without data', async () => {
    const fetchImpl = api({});
    const cache = new BrandingCache(fetchImpl);
    await Promise.all([cache.load([ID]), cache.load([ID])]);
    await cache.load([ID]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(cache.get(ID)).toEqual({});
  });

  it('retries a prefix after an error', async () => {
    const fetchImpl = api(null, false);
    const cache = new BrandingCache(fetchImpl);
    await expect(cache.load([ID])).rejects.toThrow();
    expect(cache.get(ID)).toBeUndefined();
    await cache.load([ID]).catch(() => {});
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

it('withTimeout resolves after the limit even if the promise hangs', async () => {
  vi.useFakeTimers();
  let done = false;
  void withTimeout(new Promise(() => {}), 100).then(() => (done = true));
  await vi.advanceTimersByTimeAsync(100);
  expect(done).toBe(true);
  vi.useRealTimers();
});

describe('integration with JSON.parse', () => {
  it('applies cached titles while parsing when enabled', async () => {
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ [ID]: { titles: [title('Honest')] } }))
      );
    const { configWrite } = await import('../src/core/config.js');
    const body = JSON.stringify({ responseContext: {}, items: [lockup(ID)] });

    configWrite('enableDeArrow', false);
    JSON.parse(body);
    expect(fetchSpy).not.toHaveBeenCalled();

    configWrite('enableDeArrow', true);
    // First parse: unknown video, fetched in the background.
    expect(
      JSON.parse(body).items[0].lockupViewModel.metadata.lockupMetadataViewModel
        .title.content
    ).toBe("YOU WON'T BELIEVE");
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    // Later parses use the cache.
    expect(
      JSON.parse(body).items[0].lockupViewModel.metadata.lockupMetadataViewModel
        .title.content
    ).toBe('Honest');
  });
});
