import { afterEach, describe, expect, it, vi } from 'vitest';

async function setup(body = '{"ok":true}') {
  vi.resetModules();
  const original = vi.fn(async () => new Response(body));
  vi.stubGlobal('fetch', original);
  const { FetchRegistry } = await import('../src/hooks/fetch');
  return { registry: FetchRegistry.getInstance(), original };
}

describe('FetchRegistry.waitBeforeResponse', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('delays the response until waiters settle', async () => {
    const { registry } = await setup();
    const order: string[] = [];
    registry.waitBeforeResponse(async (url, res) => {
      expect(url.pathname).toBe('/youtubei/v1/browse');
      expect(await res.clone().json()).toEqual({ ok: true });
      order.push('waiter');
    });
    const res = await window.fetch(
      'https://www.youtube.com/youtubei/v1/browse'
    );
    order.push('response');
    expect(order).toEqual(['waiter', 'response']);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('ignores waiters that fail', async () => {
    const { registry } = await setup();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    registry.waitBeforeResponse(async () => {
      throw new Error('boom');
    });
    const res = await window.fetch('https://example.com/');
    expect(res.ok).toBe(true);
  });

  it('can remove a waiter', async () => {
    const { registry } = await setup();
    const waiter = vi.fn(async () => {});
    const remove = registry.waitBeforeResponse(waiter);
    remove();
    await window.fetch('https://example.com/');
    expect(waiter).not.toHaveBeenCalled();
  });
});
