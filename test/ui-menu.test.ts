import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { KEY, press } from './helpers/keys';

const overlay = () =>
  document.getElementById('ytaf-options-overlay') as HTMLElement;
const isOpen = () => overlay().style.display === 'block';

describe('settings menu keys', () => {
  beforeAll(async () => {
    vi.useFakeTimers();
    window.ytaf_reloadApp = vi.fn();
    await import('../src/ui/ui.js');
  });

  beforeEach(() => {
    if (isOpen()) press(KEY.GREEN);
  });

  it('opens with Green and closes with Green', () => {
    press(KEY.GREEN);
    expect(isOpen()).toBe(true);
    press(KEY.GREEN);
    expect(isOpen()).toBe(false);
  });

  it('closes with Back without letting YouTube see the key', () => {
    press(KEY.GREEN);
    const reached = press(KEY.BACK);
    expect(isOpen()).toBe(false);
    // Neither the keydown nor the keyup of Back may reach YouTube, otherwise
    // YouTube treats it as "exit app" on the home screen.
    expect(reached).toEqual([]);
  });

  it('lets Back through to YouTube when the menu is closed', () => {
    expect(press(KEY.BACK)).toEqual(['keydown', 'keyup']);
  });

  it('blocks navigation keys from YouTube while open', () => {
    press(KEY.GREEN);
    expect(press(KEY.DOWN)).toEqual([]);
    expect(press(KEY.ENTER)).toEqual([]);
  });

  it('reloads the app after a change when it closes', () => {
    press(KEY.GREEN);
    press(KEY.DOWN);
    press(KEY.ENTER);
    press(KEY.BACK);
    vi.advanceTimersByTime(500);
    expect(window.ytaf_reloadApp).toHaveBeenCalled();
  });

  it('explains the Blue button when no video is playing', () => {
    expect(press(KEY.BLUE)).toEqual([]);
    expect(document.body.textContent).toContain(
      'Audio-only mode: play a video first'
    );
  });

  it('toggles audio-only mode on the watch page', () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'currentSrc', { value: 'blob:x' });
    document.body.appendChild(video);
    window.location.hash = '#/watch?v=abc';

    press(KEY.BLUE);
    expect(video.style.visibility).toBe('hidden');
    press(KEY.BLUE);
    expect(video.style.visibility).toBe('');

    video.remove();
    window.location.hash = '';
  });
});
