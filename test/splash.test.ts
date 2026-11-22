import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  playChime,
  showSplash,
  SPLASH_MAX_MS,
  SPLASH_MS
} from '../src/ui/splash';

const splash = () => document.querySelector('.ctv-splash');

describe('startup animation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('starts the animation and the sound with the first frame', () => {
    const sound = vi.fn();
    showSplash(document, { appReady: () => false, sound });
    expect(splash()!.classList).not.toContain('ctv-splash-run');
    expect(sound).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(splash()!.classList).toContain('ctv-splash-run');
    expect(sound).toHaveBeenCalledOnce();
  });

  it('counts the minimum time from the first frame', () => {
    let ready = true;
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 0);
    showSplash(document, { appReady: () => ready, sound: () => {} });
    vi.advanceTimersByTime(SPLASH_MS + 200);
    expect(splash()!.classList).not.toContain('ctv-splash-out');
    raf.mockRestore();
    ready = false;
  });

  it('stays until the animation ended and YouTube is ready', () => {
    let ready = false;
    showSplash(document, { appReady: () => ready, sound: () => {} });
    expect(splash()).not.toBeNull();
    vi.advanceTimersByTime(SPLASH_MS + 200);
    expect(splash()!.classList).not.toContain('ctv-splash-out');
    ready = true;
    vi.advanceTimersByTime(200);
    expect(splash()!.classList).toContain('ctv-splash-out');
    vi.advanceTimersByTime(500);
    expect(splash()).toBeNull();
  });

  it('goes away after the maximum time even if YouTube never paints', () => {
    showSplash(document, { appReady: () => false, sound: () => {} });
    vi.advanceTimersByTime(SPLASH_MAX_MS + 600);
    expect(splash()).toBeNull();
  });

  it('is skipped with any key', () => {
    showSplash(document, { appReady: () => false, sound: () => {} });
    document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }));
    vi.advanceTimersByTime(500);
    expect(splash()).toBeNull();
  });

  it('removes itself if the readiness check throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    showSplash(document, {
      appReady: () => {
        throw new Error('boom');
      },
      sound: () => {}
    });
    vi.advanceTimersByTime(SPLASH_MS + 700);
    expect(splash()).toBeNull();
  });

  it('keeps going when the sound fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      showSplash(document, {
        appReady: () => true,
        sound: () => {
          throw new Error('no audio');
        }
      })
    ).not.toThrow();
    expect(splash()).not.toBeNull();
  });
});

describe('startup chime', () => {
  it('returns false without Web Audio', () => {
    expect(playChime(undefined)).toBe(false);
  });

  it('returns false when the audio context cannot be created', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    class Broken {
      constructor() {
        throw new Error('blocked');
      }
    }
    expect(playChime(Broken as never)).toBe(false);
  });
});
