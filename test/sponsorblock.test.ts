import { describe, expect, it, vi } from 'vitest';
import {
  fetchSegments,
  parseSegments,
  SPONSORBLOCK_APIS
} from '../src/features/sponsorblock.js';

const ID = 'dQw4w9WgXcQ';
const seg = (start: number, end: number, category = 'sponsor') => ({
  segment: [start, end],
  category
});
const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }) as Response;

describe('parseSegments', () => {
  it('returns the valid segments of the requested video', () => {
    const results = [
      { videoID: 'other', segments: [seg(1, 2)] },
      {
        videoID: ID,
        segments: [
          seg(10, 20),
          { segment: [5], category: 'sponsor' },
          { segment: [30, 25], category: 'sponsor' },
          { segment: ['a', 'b'], category: 'sponsor' },
          { segment: [40, 50] },
          null
        ]
      }
    ];
    expect(parseSegments(results, ID)).toEqual([seg(10, 20)]);
  });

  it('tolerates malformed responses', () => {
    expect(parseSegments(null, ID)).toEqual([]);
    expect(parseSegments({ error: 'x' }, ID)).toEqual([]);
    expect(parseSegments([null, { videoID: ID }], ID)).toEqual([]);
  });
});

describe('fetchSegments', () => {
  it('queries the official server by hash prefix', async () => {
    const fetchImpl = vi.fn(async () =>
      response(200, [{ videoID: ID, segments: [seg(1, 5)] }])
    );
    await expect(fetchSegments(ID, fetchImpl as never)).resolves.toEqual([
      seg(1, 5)
    ]);
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url.startsWith(SPONSORBLOCK_APIS[0]!)).toBe(true);
    expect(url).not.toContain(ID);
  });

  it('treats 404 as a video without segments', async () => {
    const fetchImpl = vi.fn(async () => response(404, 'Not Found'));
    await expect(fetchSegments(ID, fetchImpl as never)).resolves.toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to the mirror when the official server fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        response(200, [{ videoID: ID, segments: [seg(3, 4)] }])
      );
    await expect(fetchSegments(ID, fetchImpl)).resolves.toEqual([seg(3, 4)]);
    expect(String(fetchImpl.mock.calls[1]![0])).toContain(SPONSORBLOCK_APIS[1]);
  });

  it('fails only when every server fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => response(503, null));
    await expect(fetchSegments(ID, fetchImpl as never)).rejects.toThrow(
      'HTTP 503'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(SPONSORBLOCK_APIS.length);
  });

  it('gives up on a server that does not answer', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValueOnce(response(200, []));
    const result = fetchSegments(ID, fetchImpl);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(result).resolves.toEqual([]);
    vi.useRealTimers();
  });
});

describe('live settings', () => {
  it('starts and stops when SponsorBlock is turned on or off', async () => {
    const { configWrite } = await import('../src/core/config.js');
    vi.spyOn(window, 'fetch').mockResolvedValue(response(404, null));
    const win = window as unknown as {
      sponsorblock: { videoID: string } | null;
    };

    configWrite('enableSponsorBlock', true);
    window.location.hash = `#/watch?v=${ID}`;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(win.sponsorblock?.videoID).toBe(ID);

    configWrite('enableSponsorBlock', false);
    expect(win.sponsorblock).toBeNull();

    configWrite('enableSponsorBlock', true);
    expect(win.sponsorblock?.videoID).toBe(ID);

    window.location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(win.sponsorblock).toBeNull();
  });
});
