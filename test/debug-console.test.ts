import { afterEach, describe, expect, it, vi } from 'vitest';

describe('debug console remote logging', () => {
  afterEach(() => {
    delete window.__ytaf_debug__;
  });

  it('sends nothing over the network when no proxy is known', async () => {
    const created: string[] = [];
    vi.stubGlobal(
      'Image',
      class {
        set src(v: string) {
          created.push(v);
        }
      }
    );
    window.__ytaf_debug__ = true;
    const { debugConsole } = await import('../src/ui/debug-console');
    debugConsole.log('hello');
    console.info('a log line');
    expect(created).toEqual([]);
  });

  it('has no hardcoded proxy address', async () => {
    const { getProxyIP } = await import('../src/loader/proxy-config');
    expect(getProxyIP()).toBeNull();
  });
});
