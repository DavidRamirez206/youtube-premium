import { afterEach, describe, expect, it } from 'vitest';
import { configWrite } from '../src/core/config.js';
import { markInlinePlayback } from '../src/hooks/json-stringify';

const request = () => ({
  videoId: 'abcdefghijk',
  playbackContext: { contentPlaybackContext: {} as Record<string, unknown> }
});
const marked = (hash: string) => {
  const r = request();
  markInlinePlayback(r, hash);
  return r.playbackContext.contentPlaybackContext.isInlinePlaybackNoAd === true;
};

describe('inline playback flag', () => {
  afterEach(() => {
    configWrite('enableAdBlock', true);
    configWrite('saveWatchHistory', true);
  });

  it('leaves watch page playback unmarked so history is saved', () => {
    expect(marked('#/watch?v=abcdefghijk')).toBe(false);
  });

  it('still marks previews on other pages', () => {
    expect(marked('#/')).toBe(true);
  });

  it('marks watch playback when history saving is off', () => {
    configWrite('saveWatchHistory', false);
    expect(marked('#/watch?v=abcdefghijk')).toBe(true);
  });

  it('never marks anything when ad blocking is off', () => {
    configWrite('enableAdBlock', false);
    configWrite('saveWatchHistory', false);
    expect(marked('#/')).toBe(false);
  });

  it('ignores other objects', () => {
    expect(() => markInlinePlayback({ a: 1 }, '#/')).not.toThrow();
    expect(() => markInlinePlayback(null, '#/')).not.toThrow();
  });

  it('does not change what JSON.stringify produces otherwise', () => {
    expect(JSON.stringify({ a: [1, 'b'] })).toBe('{"a":[1,"b"]}');
    expect(JSON.stringify('x')).toBe('"x"');
  });
});
