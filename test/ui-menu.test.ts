import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { KEY, press } from './helpers/keys';

const overlay = () =>
  document.getElementById('ytaf-options-overlay') as HTMLElement;
const isOpen = () => overlay().style.display === 'block';
const dialogVisible = () =>
  document
    .getElementById('ytaf-options-panel')!
    .classList.contains('ctv-dialog-open');

describe('settings menu keys', () => {
  beforeAll(async () => {
    vi.useFakeTimers();
    window.ytaf_reloadApp = vi.fn();
    await import('../src/ui/ui.js');
  });

  beforeEach(() => {
    // Close the menu, discarding anything left by a previous test.
    if (isOpen()) press(KEY.BACK);
    if (isOpen()) {
      press(KEY.RIGHT);
      press(KEY.ENTER);
    }
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

  it('asks before closing with unsaved changes and can discard them', async () => {
    const { configRead } = await import('../src/core/config.js');
    press(KEY.GREEN);
    press(KEY.ENTER); // stage "Block ads" off
    expect(configRead('enableAdBlock')).toBe(true);

    press(KEY.BACK);
    expect(isOpen()).toBe(true);
    expect(dialogVisible()).toBe(true);

    press(KEY.BACK); // keep editing
    expect(dialogVisible()).toBe(false);
    expect(isOpen()).toBe(true);

    press(KEY.GREEN);
    press(KEY.RIGHT); // Discard
    press(KEY.ENTER);
    expect(isOpen()).toBe(false);
    expect(configRead('enableAdBlock')).toBe(true);
    expect(window.ytaf_reloadApp).not.toHaveBeenCalled();
  });

  it('applies changes from the bar without reloading the app', async () => {
    const { configRead, configWrite } = await import('../src/core/config.js');
    press(KEY.GREEN);
    press(KEY.ENTER);
    press(KEY.BACK);
    press(KEY.ENTER); // Apply
    expect(isOpen()).toBe(false);
    expect(configRead('enableAdBlock')).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(window.ytaf_reloadApp).not.toHaveBeenCalled();
    configWrite('enableAdBlock', true);
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
