// Default playback speed. Works on the <video> element directly, so it does
// not depend on YouTube's player API:
//
// - when a new video starts on the watch page, the configured speed is set;
// - YouTube TV resets the speed to its own value right after a video
//   starts, so for a few seconds any change away from the configured speed
//   is undone;
// - after that window, a speed picked in YouTube's own menu is respected
//   until the next video.
//
// Previews (home page) and Shorts are never touched.

import { configAddChangeListener, configRead } from '../core/config';
import { t } from '../core/i18n';
import { guard, reportError } from '../core/safe';
import { getPlayerManager } from '../player_api';
import { showNotification } from '../ui/ui';

/** How long after a video starts YouTube's own speed resets are undone. */
export const ENFORCE_MS = 6000;

/** ID of the video on the watch page, or null elsewhere. */
export function watchVideoId(hash: string): string | null {
  if (!hash.startsWith('#/watch')) return null;
  const query = hash.split('?')[1] ?? '';
  for (const part of query.split('&')) {
    const [name, value] = part.split('=');
    if (name === 'v' && value) return decodeURIComponent(value);
  }
  return null;
}

interface SpeedOptions {
  getHash?: () => string;
  getRate?: () => number;
  setPlayerRate?: (rate: number) => void;
  now?: () => number;
  notify?: (text: string) => void;
}

export function installPlaybackSpeed(
  doc: Document = document,
  {
    getHash = () => window.location.hash,
    getRate = () => Number(configRead('playbackSpeed')) || 1,
    setPlayerRate = () => {},
    now = () => Date.now(),
    notify = (text) => showNotification(text, 1500, 'blue')
  }: SpeedOptions = {}
) {
  let currentId: string | null = null;
  let enforceUntil = 0;

  const apply = (video: HTMLVideoElement, announce: boolean) => {
    const rate = getRate();
    if (Math.abs(video.playbackRate - rate) < 0.001) return;
    try {
      setPlayerRate(rate);
    } catch (error) {
      reportError('playback speed (player API)', error);
    }
    video.playbackRate = rate;
    if (announce && rate !== 1)
      notify(t('notify.speed', { speed: `${rate}x` }));
  };

  const onPlaybackEvent = guard('playback speed', (event: Event) => {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement)) return;
    const id = watchVideoId(getHash());
    if (!id) return;

    if (id !== currentId) {
      currentId = id;
      enforceUntil = now() + ENFORCE_MS;
      apply(video, true);
    } else if (now() < enforceUntil) {
      apply(video, false);
    }
  });

  // Media events do not bubble, so listen in the capture phase.
  for (const type of ['loadedmetadata', 'playing', 'ratechange']) {
    doc.addEventListener(type, onPlaybackEvent, true);
  }

  configAddChangeListener(
    'playbackSpeed',
    guard('playback speed', () => {
      if (!watchVideoId(getHash())) return;
      const video = doc.querySelector('video');
      if (video) apply(video, true);
    })
  );
}

let playerSetRate: ((rate: number) => void) | null = null;

installPlaybackSpeed(document, {
  setPlayerRate: (rate) => playerSetRate?.(rate)
});

// Also tell YouTube's player, when its API is available, so its own menu
// shows the right speed.
getPlayerManager()
  .then((manager) => {
    playerSetRate = (rate) => manager.player.setPlaybackRate?.(rate);
  })
  .catch((error: unknown) => reportError('playback speed', error));
