import { describe, expect, it, vi } from 'vitest';

describe('clock', () => {
  it('moves when the YouTube logo is hidden or shown', async () => {
    vi.useFakeTimers();
    const { configWrite } = await import('../src/core/config.js');
    await import('../src/features/watch.js');
    configWrite('showWatch', true);
    const clock = document.getElementById('ytaf-clock-widget')!;
    expect(clock.style.right).toBe('360px');

    configWrite('hideLogo', true);
    expect(clock.style.right).toBe('76px');

    configWrite('hideLogo', false);
    expect(clock.style.right).toBe('360px');

    configWrite('showWatch', false);
    expect(document.getElementById('ytaf-clock-widget')).toBeNull();
    vi.useRealTimers();
  });
});
