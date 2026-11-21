import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/player_api', async (orig) => ({
  ...(await orig<typeof import('../src/player_api')>()),
  // The module installs itself on import; keep that from blocking.
  getPlayerManager: () => new Promise(() => {})
}));

const { applyPlaybackSpeed, installPlaybackSpeed } =
  await import('../src/features/playback-speed');
const { PlayerMode } = await import('../src/player_api');
const { configWrite } = await import('../src/core/config.js');

function fakeManager(mode = PlayerMode.NORMAL) {
  const target = new EventTarget();
  const player = { setPlaybackRate: vi.fn() };
  return Object.assign(target, { player, playerMode: mode }) as never as {
    player: typeof player;
    playerMode: number;
    dispatchEvent(e: Event): boolean;
    addEventListener(t: string, cb: () => void): void;
  };
}

describe('applyPlaybackSpeed', () => {
  it('uses the player API and the video element', () => {
    const player = { setPlaybackRate: vi.fn() };
    const video = document.createElement('video');
    applyPlaybackSpeed(player, video, 1.5);
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
    expect(video.playbackRate).toBe(1.5);
  });

  it('still sets the video when the API is missing or throws', () => {
    const video = document.createElement('video');
    applyPlaybackSpeed({}, video, 2);
    expect(video.playbackRate).toBe(2);
    const throwing = {
      setPlaybackRate: () => {
        throw new Error('nope');
      }
    };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    applyPlaybackSpeed(throwing, video, 1.25);
    expect(video.playbackRate).toBe(1.25);
  });
});

describe('installPlaybackSpeed', () => {
  it('applies the configured speed once per new video', () => {
    configWrite('playbackSpeed', 1.75);
    const manager = fakeManager();
    const video = document.createElement('video');
    installPlaybackSpeed(manager as never, () => video);

    manager.dispatchEvent(new Event('newVideo'));
    manager.dispatchEvent(new Event('playbackStart'));
    expect(video.playbackRate).toBe(1.75);

    // The user picks another speed in YouTube's menu: keep it.
    video.playbackRate = 1;
    manager.dispatchEvent(new Event('playbackStart'));
    expect(video.playbackRate).toBe(1);
  });

  it('leaves previews and Shorts alone', () => {
    configWrite('playbackSpeed', 2);
    const manager = fakeManager(PlayerMode.PREVIEW);
    const video = document.createElement('video');
    installPlaybackSpeed(manager as never, () => video);
    manager.dispatchEvent(new Event('newVideo'));
    manager.dispatchEvent(new Event('playbackStart'));
    expect(video.playbackRate).toBe(1);
  });

  it('applies a new speed chosen in the menu right away', () => {
    const manager = fakeManager();
    const video = document.createElement('video');
    installPlaybackSpeed(manager as never, () => video);
    configWrite('playbackSpeed', 1.25);
    expect(video.playbackRate).toBe(1.25);
  });
});
