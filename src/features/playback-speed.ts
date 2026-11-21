// Default playback speed. Applied once when a new video starts playing, so a
// speed chosen in YouTube's own player menu is respected until the next
// video. Previews and Shorts keep their normal speed.

import { configAddChangeListener, configRead } from '../core/config';
import { getPlayerManager, PlayerMode } from '../player_api';
import type { YTPlayer } from '../player_api';

interface SpeedTarget {
  readonly player: YTPlayer;
  readonly playerMode: PlayerMode;
  addEventListener(type: 'newVideo' | 'playbackStart', cb: () => void): void;
}

/** Sets the speed through the player API, falling back to the <video>. */
export function applyPlaybackSpeed(
  player: Pick<YTPlayer, 'setPlaybackRate'>,
  video: HTMLVideoElement | null,
  rate: number
) {
  try {
    player.setPlaybackRate?.(rate);
  } catch (e) {
    console.warn('[playback-speed] setPlaybackRate failed', e);
  }
  if (video && Math.abs(video.playbackRate - rate) > 0.001) {
    video.playbackRate = rate;
  }
}

export function installPlaybackSpeed(
  manager: SpeedTarget,
  getVideo: () => HTMLVideoElement | null = () =>
    document.querySelector('video')
) {
  let pending = false;

  const applyNow = () =>
    applyPlaybackSpeed(
      manager.player,
      getVideo(),
      Number(configRead('playbackSpeed'))
    );

  manager.addEventListener('newVideo', () => {
    pending = true;
  });

  manager.addEventListener('playbackStart', () => {
    if (!pending || manager.playerMode !== PlayerMode.NORMAL) return;
    pending = false;
    applyNow();
  });

  configAddChangeListener('playbackSpeed', () => {
    if (manager.playerMode === PlayerMode.NORMAL) applyNow();
  });
}

void getPlayerManager().then((manager) => installPlaybackSpeed(manager));
