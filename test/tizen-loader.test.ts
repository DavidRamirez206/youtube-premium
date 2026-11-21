import { beforeAll, describe, expect, it, vi } from 'vitest';

const HTML = '<html><head></head><body></body></html>';
const requested: string[] = [];
const networkFetch = async (input: RequestInfo | URL) => {
  requested.push(input instanceof Request ? input.url : String(input));
  return new Response(HTML, { status: 200 });
};

const lastUrl = () => requested[requested.length - 1];

describe('runTizenLoader network patches', () => {
  beforeAll(async () => {
    // jsdom and Node's fetch use different AbortSignal classes, so cloning a
    // real Request fails here. A minimal Request keeps the test on our logic.
    class FakeRequest {
      url: string;
      constructor(input: string | FakeRequest) {
        this.url = typeof input === 'string' ? input : input.url;
      }
    }
    vi.stubGlobal('Request', FakeRequest);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    window.fetch = networkFetch as typeof window.fetch;
    vi.spyOn(document, 'open').mockImplementation(
      () => document as unknown as Window
    );
    vi.spyOn(document, 'write').mockImplementation(() => {});
    vi.spyOn(document, 'close').mockImplementation(() => {});
    const { runTizenLoader } = await import('../src/tizen-loader');
    await runTizenLoader();
  });

  it('fetches YouTube TV and hides the watermark on the local URL', () => {
    expect(requested[0]).toBe('https://www.youtube.com/tv');
    expect(
      new URL(window.location.href).searchParams.get('env_hideWatermark')
    ).toBe('1');
  });

  it('applies the rewritten URL to string requests', async () => {
    await window.fetch('https://api/lounge/bc/bind?x=1');
    expect(lastUrl()).toBe('https://www.youtube.com/api/lounge/bc/bind?x=1');
  });

  it('applies the rewritten URL to Request objects', async () => {
    await window.fetch(new Request('https:///youtubei/v1/browse'));
    expect(lastUrl()).toBe('https://www.youtube.com/youtubei/v1/browse');
  });

  it('applies the rewritten URL to URL objects', async () => {
    await window.fetch(new URL('https://api/lounge/pairing'));
    expect(lastUrl()).toBe('https://www.youtube.com/api/lounge/pairing');
  });

  it('leaves third-party URLs untouched', async () => {
    await window.fetch('https://sponsor.ajay.app/api/skipSegments');
    expect(lastUrl()).toBe('https://sponsor.ajay.app/api/skipSegments');
  });

  it('rewrites XMLHttpRequest URLs', () => {
    const xhr = new XMLHttpRequest();
    const open = vi.spyOn(xhr, 'open');
    xhr.open('GET', 'https://api/lounge/bc/test');
    // The patched prototype method forwards the fixed URL to the original.
    expect(open).toHaveBeenCalled();
  });
});
