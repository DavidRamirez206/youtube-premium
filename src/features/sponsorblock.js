import sha256 from 'tiny-sha256';
import { guard } from '../core/safe';
import { configRead } from '../core/config';
import { showNotification } from '../ui/ui';

// Copied from https://github.com/ajayyy/SponsorBlock/blob/9392d16617d2d48abb6125c00e2ff6042cb7bebe/src/config.ts#L179-L233
const barTypes = {
  sponsor: {
    color: '#00d400',
    opacity: '0.7',
    name: 'sponsored segment'
  },
  intro: {
    color: '#00ffff',
    opacity: '0.7',
    name: 'intro'
  },
  outro: {
    color: '#0202ed',
    opacity: '0.7',
    name: 'outro'
  },
  interaction: {
    color: '#cc00ff',
    opacity: '0.7',
    name: 'interaction reminder'
  },
  selfpromo: {
    color: '#ffff00',
    opacity: '0.7',
    name: 'self-promotion'
  },
  music_offtopic: {
    color: '#ff9900',
    opacity: '0.7',
    name: 'non-music part'
  },
  preview: {
    color: '#008fd6',
    opacity: '0.7',
    name: 'recap or preview'
  }
};

/** Official server first; the community mirror if it fails. */
export const SPONSORBLOCK_APIS = [
  'https://sponsor.ajay.app/api',
  'https://sponsorblock.inf.re/api'
];
const REQUEST_TIMEOUT_MS = 5000;

const CATEGORIES = [
  'sponsor',
  'intro',
  'outro',
  'interaction',
  'selfpromo',
  'music_offtopic',
  'preview'
];

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
function timeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Valid segments of `videoID` from a hash-prefix API response. Anything
 * malformed is dropped instead of breaking playback.
 * @param {unknown} results
 * @param {string} videoID
 * @returns {{ segment: [number, number], category: string, skipped?: boolean }[]}
 */
export function parseSegments(results, videoID) {
  if (!Array.isArray(results)) return [];
  const entry = results.find((v) => v && v.videoID === videoID);
  if (!entry || !Array.isArray(entry.segments)) return [];
  return entry.segments.filter(
    (seg) =>
      seg &&
      typeof seg.category === 'string' &&
      Array.isArray(seg.segment) &&
      seg.segment.length >= 2 &&
      Number.isFinite(seg.segment[0]) &&
      Number.isFinite(seg.segment[1]) &&
      seg.segment[1] > seg.segment[0]
  );
}

/**
 * Fetches the segments of a video by hash prefix, trying each server in
 * turn. A 404 means the prefix has no segments. Throws only when every
 * server fails.
 * @param {string} videoID
 * @param {typeof fetch} fetchImpl
 */
export async function fetchSegments(videoID, fetchImpl = window.fetch) {
  const videoHash = sha256(videoID).substring(0, 4);
  const query = `categories=${encodeURIComponent(JSON.stringify(CATEGORIES))}`;
  let lastError = null;

  // Servers are tried one after another on purpose: the mirror is only a
  // fallback.
  /* eslint-disable no-await-in-loop */
  for (const api of SPONSORBLOCK_APIS) {
    try {
      const resp = await timeout(
        fetchImpl(`${api}/skipSegments/${videoHash}?${query}`),
        REQUEST_TIMEOUT_MS
      );
      if (resp.status === 404) return [];
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return parseSegments(
        await timeout(resp.json(), REQUEST_TIMEOUT_MS),
        videoID
      );
    } catch (error) {
      console.warn('[SponsorBlock]', api, 'failed:', error);
      lastError = error;
    }
  }
  /* eslint-enable no-await-in-loop */
  throw lastError ?? new Error('no SponsorBlock server available');
}

class SponsorBlockHandler {
  video = null;
  active = true;

  attachVideoTimeout = null;
  nextSkipTimeout = null;

  slider = null;
  sliderInterval = null;
  sliderObserver = null;
  sliderSegmentsOverlay = null;

  scheduleSkipHandler = null;
  durationChangeHandler = null;
  segments = null;
  skippableCategories = [];

  constructor(videoID) {
    this.videoID = videoID;
  }

  async init() {
    let segments;
    try {
      segments = await fetchSegments(this.videoID);
    } catch (error) {
      console.warn(this.videoID, 'SponsorBlock unavailable:', error);
      return;
    }

    // The user may have moved to another video while the request ran.
    if (!this.active) return;

    if (!segments.length) {
      console.debug(this.videoID, 'No segments found.');
      return;
    }

    this.segments = segments;
    this.skippableCategories = this.getSkippableCategories();

    this.scheduleSkipHandler = guard('SponsorBlock skip', () =>
      this.scheduleSkip()
    );
    this.durationChangeHandler = guard('SponsorBlock overlay', () =>
      this.buildOverlay()
    );

    this.attachVideo();
    guard('SponsorBlock overlay', () => this.buildOverlay())();
  }

  getSkippableCategories() {
    const skippableCategories = [];
    if (configRead('enableSponsorBlockSponsor')) {
      skippableCategories.push('sponsor');
    }
    if (configRead('enableSponsorBlockIntro')) {
      skippableCategories.push('intro');
    }
    if (configRead('enableSponsorBlockOutro')) {
      skippableCategories.push('outro');
    }
    if (configRead('enableSponsorBlockInteraction')) {
      skippableCategories.push('interaction');
    }
    if (configRead('enableSponsorBlockSelfPromo')) {
      skippableCategories.push('selfpromo');
    }
    if (configRead('enableSponsorBlockMusicOfftopic')) {
      skippableCategories.push('music_offtopic');
    }
    if (configRead('enableSponsorBlockPreview')) {
      skippableCategories.push('preview');
    }
    return skippableCategories;
  }

  attachVideo() {
    clearTimeout(this.attachVideoTimeout);
    this.attachVideoTimeout = null;

    this.video = document.querySelector('video');
    if (!this.video) {
      console.debug(this.videoID, 'No video yet...');
      this.attachVideoTimeout = setTimeout(
        guard('SponsorBlock attach', () => this.active && this.attachVideo()),
        100
      );
      return;
    }

    console.debug(this.videoID, 'Video found, binding...');

    this.video.addEventListener('play', this.scheduleSkipHandler);
    this.video.addEventListener('pause', this.scheduleSkipHandler);
    this.video.addEventListener('timeupdate', this.scheduleSkipHandler);
    this.video.addEventListener('durationchange', this.durationChangeHandler);
  }

  buildOverlay() {
    if (this.sliderSegmentsOverlay) {
      console.debug('Overlay already built');
      return;
    }

    if (!this.video || !this.video.duration) {
      console.debug('No video duration yet');
      return;
    }

    const videoDuration = this.video.duration;

    this.sliderSegmentsOverlay = document.createElement('div');
    this.sliderSegmentsOverlay.className =
      'ytaf-sponsorblock-segment-container';

    this.segments.forEach((segment) => {
      const [start, end] = segment.segment;
      const barType = barTypes[segment.category] || {
        color: 'blue'
      };
      const elm = document.createElement('div');
      elm.className = 'ytaf-sponsorblock-segment';
      elm.style['background-color'] = barType.color;
      elm.style['left'] = `${(start / videoDuration) * 100.0}%`;
      elm.style['width'] = `${((end - start) / videoDuration) * 100.0}%`;
      this.sliderSegmentsOverlay.appendChild(elm);
    });

    const addSliderObserver = (ele) => {
      this.sliderObserver.observe(ele, {
        childList: true,
        subtree: true
      });
    };

    const addSliderOverlay = () => {
      this.slider.appendChild(this.sliderSegmentsOverlay);
    };

    const watchForSlider = () => {
      if (this.sliderInterval) clearInterval(this.sliderInterval);

      this.sliderInterval = setInterval(
        guard('SponsorBlock slider', () => {
          const nodes = document.querySelectorAll('[idomkey=progress-bar]');
          const last = nodes[nodes.length - 1];
          switch (nodes.length) {
            case 3: {
              // Slider has chapter markers.
              this.slider = last;
              break;
            }
            case 2: {
              // Slider has no markers or auto-markers
              this.slider = last.querySelector('[idomkey=slider]');
              break;
            }
            default: {
              return; // no slider found yet
            }
          }

          console.debug('slider found...', this.slider);
          clearInterval(this.sliderInterval);
          this.sliderInterval = null;
          addSliderObserver(last);
          addSliderOverlay();
        }),
        100
      );
    };

    this.sliderObserver = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.removedNodes) {
          for (const node of m.removedNodes) {
            if (node === this.sliderSegmentsOverlay) {
              console.debug('bringing back segments overlay');
              addSliderOverlay();
            }
            if (node === this.slider) {
              console.debug('slider removed, watching again');
              this.sliderObserver.disconnect();
              watchForSlider();
            }
          }
        }
      });
    });

    watchForSlider();
  }

  scheduleSkip() {
    clearTimeout(this.nextSkipTimeout);
    this.nextSkipTimeout = null;

    if (!this.active) {
      console.debug(this.videoID, 'No longer active, ignoring...');
      return;
    }

    if (this.video.paused) {
      console.debug(this.videoID, 'Currently paused, ignoring...');
      return;
    }

    // Sometimes timeupdate event (that calls scheduleSkip) gets fired right before
    // already scheduled skip routine below. Let's just look back a little bit
    // and, in worst case, perform a skip at negative interval (immediately)...
    // Only segments of enabled categories, so a disabled one never delays
    // the next skip.
    const nextSegments = this.segments.filter(
      (seg) =>
        !seg.skipped &&
        this.skippableCategories.includes(seg.category) &&
        seg.segment[0] > this.video.currentTime - 0.3 &&
        seg.segment[1] > this.video.currentTime - 0.3
    );
    nextSegments.sort((s1, s2) => s1.segment[0] - s2.segment[0]);

    if (!nextSegments.length) {
      console.debug(this.videoID, 'No more segments');
      return;
    }

    const [segment] = nextSegments;
    const [start, end] = segment.segment;
    console.debug(
      this.videoID,
      'Scheduling skip of',
      segment,
      'in',
      start - this.video.currentTime
    );

    this.nextSkipTimeout = setTimeout(
      guard('SponsorBlock skip', () => {
        if (!this.active || !this.video || this.video.paused) {
          console.debug(this.videoID, 'Currently paused, ignoring...');
          return;
        }
        if (!this.skippableCategories.includes(segment.category)) {
          console.debug(
            this.videoID,
            'Segment',
            segment.category,
            'is not skippable, ignoring...'
          );
          return;
        }

        const skipName = barTypes[segment.category]?.name || segment.category;
        console.debug(this.videoID, 'Skipping', segment);
        showNotification(`Skipped ${skipName}`, 2000, 'green');

        // Prevent infinite loops when currentTime updates asynchronously
        segment.skipped = true;

        this.video.currentTime = end;
        this.scheduleSkip();
      }),
      Math.max(0, (start - this.video.currentTime) * 1000)
    );
  }

  destroy() {
    console.debug(this.videoID, 'Destroying');

    this.active = false;

    if (this.nextSkipTimeout) {
      clearTimeout(this.nextSkipTimeout);
      this.nextSkipTimeout = null;
    }

    if (this.attachVideoTimeout) {
      clearTimeout(this.attachVideoTimeout);
      this.attachVideoTimeout = null;
    }

    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }

    if (this.sliderObserver) {
      this.sliderObserver.disconnect();
      this.sliderObserver = null;
    }

    if (this.sliderSegmentsOverlay) {
      this.sliderSegmentsOverlay.remove();
      this.sliderSegmentsOverlay = null;
    }

    if (this.video) {
      this.video.removeEventListener('play', this.scheduleSkipHandler);
      this.video.removeEventListener('pause', this.scheduleSkipHandler);
      this.video.removeEventListener('timeupdate', this.scheduleSkipHandler);
      this.video.removeEventListener(
        'durationchange',
        this.durationChangeHandler
      );
    }
  }
}

// When this global variable was declared using let and two consecutive hashchange
// events were fired (due to bubbling? not sure...) the second call handled below
// would not see the value change from first call, and that would cause multiple
// SponsorBlockHandler initializations... This has been noticed on Chromium 38.
// This either reveals some bug in chromium/webpack/babel scope handling, or
// shows my lack of understanding of javascript. (or both)
window.sponsorblock = null;

function uninitializeSponsorblock() {
  if (!window.sponsorblock) {
    return;
  }
  try {
    window.sponsorblock.destroy();
  } catch (err) {
    console.warn('window.sponsorblock.destroy() failed!', err);
  }
  window.sponsorblock = null;
}

window.addEventListener(
  'hashchange',
  guard('SponsorBlock navigation', () => {
    const newURL = new URL(location.hash.substring(1), location.href);
    // uninitialize sponsorblock when not on `/watch` path, to prevent
    // it from attaching to playback preview video element loaded on
    // home page
    if (newURL.pathname !== '/watch' && window.sponsorblock) {
      console.debug('uninitializing sponsorblock on a non-video page');
      uninitializeSponsorblock();
      return;
    }

    const videoID = newURL.searchParams.get('v');
    const needsReload =
      videoID &&
      (!window.sponsorblock || window.sponsorblock.videoID != videoID);

    console.debug(
      'hashchange',
      videoID,
      window.sponsorblock,
      window.sponsorblock ? window.sponsorblock.videoID : null,
      needsReload
    );

    if (needsReload) {
      uninitializeSponsorblock();

      if (configRead('enableSponsorBlock')) {
        window.sponsorblock = new SponsorBlockHandler(videoID);
        window.sponsorblock.init().catch((error) => {
          console.warn('SponsorBlock failed to start:', error);
        });
      } else {
        console.info('SponsorBlock disabled, not loading');
      }
    }
  }),
  false
);
