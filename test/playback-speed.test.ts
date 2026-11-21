import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/player_api', async (orig) => ({
  ...(await orig<typeof import('../src/player_api')>()),
  // The module installs itself on import; keep the player API pending.
  getPlayerManager: () => new Promise(() => {})
}));

const { installPlaybackSpeed, watchVideoId, ENFORCE_MS } =
  await import('../src/features/playback-speed');
const { configWrite } = await import('../src/core/config.js');

function setup(rate = 1.5) {
  // A separate document so the module's own install does not interfere.
  const doc = document.implementation.createHTMLDocument('player');
  const location = { hash: '#/watch?v=abcdefghijk' };
  const video = doc.createElement('video');
  doc.body.appendChild(video);
  let time = 0;
  const notify = vi.fn();
  const setPlayerRate = vi.fn();
  installPlaybackSpeed(doc, {
    getHash: () => location.hash,
    getRate: () => rate,
    now: () => time,
    notify,
    setPlayerRate
  });
  const fire = (type: string) => video.dispatchEvent(new Event(type));
  return {
    location,
    video,
    fire,
    notify,
    setPlayerRate,
    advance: (ms: number) => (time += ms)
  };
}

describe('watchVideoId', () => {
  it('reads the video of the watch page only', () => {
    expect(watchVideoId('#/watch?v=abcdefghijk&t=10')).toBe('abcdefghijk');
    expect(watchVideoId('#/watch?list=x&v=abcdefghijk')).toBe('abcdefghijk');
    expect(watchVideoId('#/')).toBeNull();
    expect(watchVideoId('#/shorts?v=abcdefghijk')).toBeNull();
    expect(watchVideoId('#/watch')).toBeNull();
  });
});

describe('playback speed', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sets the speed when a video starts and announces it', () => {
    const { video, fire, notify, setPlayerRate } = setup(1.5);
    fire('loadedmetadata');
    expect(video.playbackRate).toBe(1.5);
    expect(setPlayerRate).toHaveBeenCalledWith(1.5);
    expect(notify).toHaveBeenCalledWith('Speed 1.5x');
  });

  it('undoes YouTube resetting the speed right after the start', () => {
    const { video, fire, advance } = setup(2);
    fire('playing');
    advance(500);
    video.playbackRate = 1; // YouTube restores its own speed
    fire('ratechange');
    expect(video.playbackRate).toBe(2);
  });

  it('respects a speed chosen later in YouTube’s menu', () => {
    const { video, fire, advance } = setup(2);
    fire('playing');
    advance(ENFORCE_MS + 1);
    video.playbackRate = 1.25;
    fire('ratechange');
    expect(video.playbackRate).toBe(1.25);
  });

  it('applies again to the next video', () => {
    const { location, video, fire, advance } = setup(1.75);
    fire('playing');
    advance(ENFORCE_MS + 1);
    video.playbackRate = 1;
    location.hash = '#/watch?v=bbbbbbbbbbb';
    fire('loadedmetadata');
    expect(video.playbackRate).toBe(1.75);
  });

  it('leaves previews outside the watch page alone', () => {
    const { location, video, fire } = setup(2);
    location.hash = '#/';
    fire('playing');
    expect(video.playbackRate).toBe(1);
  });

  it('does not announce normal speed', () => {
    const { fire, notify } = setup(1);
    fire('playing');
    expect(notify).not.toHaveBeenCalled();
  });

  it('keeps working if the player API throws', () => {
    const doc = document.implementation.createHTMLDocument('player');
    const video = doc.createElement('video');
    doc.body.appendChild(video);
    installPlaybackSpeed(doc, {
      getHash: () => '#/watch?v=abcdefghijk',
      getRate: () => 1.25,
      notify: () => {},
      setPlayerRate: () => {
        throw new Error('no API');
      }
    });
    video.dispatchEvent(new Event('playing'));
    expect(video.playbackRate).toBe(1.25);
  });

  it('applies a new speed from the menu to the current video', () => {
    const doc = document.implementation.createHTMLDocument('player');
    const video = doc.createElement('video');
    doc.body.appendChild(video);
    installPlaybackSpeed(doc, {
      getHash: () => '#/watch?v=abcdefghijk',
      notify: () => {}
    });
    configWrite('playbackSpeed', 1.1);
    expect(video.playbackRate).toBe(1.1);
    configWrite('playbackSpeed', 1);
  });
});
