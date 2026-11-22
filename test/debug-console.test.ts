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

describe('debug console buffer', () => {
  it('draws nothing until it is shown, then the newest lines first', async () => {
    const { debugConsole } = await import('../src/ui/debug-console');
    console.info('first line', { a: 1 });
    console.warn('second line');
    expect(document.getElementById('ytaf-debug-console')).toBeNull();

    debugConsole.setVisible(true);
    const rows = document.getElementById('ytaf-debug-console')!.children;
    expect(rows[0]!.textContent).toContain('[WARN] second line');
    expect(rows[1]!.textContent).toContain('[INFO] first line {"a":1}');

    console.log('live line');
    expect(rows[0]!.textContent).toContain('[LOG] live line');

    debugConsole.setVisible(false);
    expect(document.getElementById('ytaf-debug-console')).toBeNull();
  });

  it('survives values that cannot be turned into text', async () => {
    const { formatLine } = await import('../src/ui/debug-console');
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(formatLine({ time: 0, label: '[LOG] ', args: [loop] })).toContain(
      '[object Object]'
    );
  });
});
