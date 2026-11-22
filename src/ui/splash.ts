// Startup animation: the ClearTube TV mark draws itself with a short
// synthesized chime while YouTube loads underneath. It is skipped with any
// key, never blocks YouTube, and removes itself even if something fails.

import { configRead } from '../core/config';
import { reportError } from '../core/safe';
import { SPLASH_FONT_FAMILY, SPLASH_FONT_URL } from './splash-font';

/** Length of the animation before it may fade out. */
export const SPLASH_MS = 2600;
/** The splash is removed after this even if YouTube has not painted. */
export const SPLASH_MAX_MS = 7000;
/** The parts of the mark stop moving this long after the first frame. */
export const SPLASH_MOTION_MS = 1950;
const FADE_MS = 400;

// Each part of the mark is its own layer and only transform and opacity
// are animated: the TV's compositor keeps those running smoothly while the
// main thread is busy parsing YouTube's scripts. Hidden parts start at 1%
// opacity and never at scale 0, so they are drawn with the first frame and
// not when they appear. The name uses an embedded copy of YouTube's font,
// loaded before the first frame, so it never changes while it is shown.
const svg = (cls: string, body: string) =>
  `<div class="ctv-splash-part ${cls}"><svg viewBox="0 0 512 512" width="220" height="220" aria-hidden="true">${body}</svg></div>`;

const MARK =
  svg(
    'ctv-splash-arc',
    '<path d="M370.9 159.6A150 150 0 1 0 370.9 352.4" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round"/>'
  ) +
  svg(
    'ctv-splash-play',
    '<path d="M226 200v112l92-56z" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>'
  ) +
  svg(
    'ctv-splash-spark',
    '<path d="M404 222l9 25 25 9-25 9-9 25-9-25-25-9 25-9z" fill="#fff"/>'
  );

const EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
const EASE_BACK = 'cubic-bezier(.34,1.56,.64,1)';

const STYLE = `
@font-face{font-family:'${SPLASH_FONT_FAMILY}';font-weight:600;font-display:block;
  src:url(${SPLASH_FONT_URL}) format('woff2')}
.ctv-splash{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#0b0f14;background:radial-gradient(circle at 50% 45%,#13303a 0,#0b0f14 60%);
  font-family:'${SPLASH_FONT_FAMILY}',Roboto,Arial,sans-serif;pointer-events:none;
  opacity:1;transition:opacity ${FADE_MS}ms ease-out;will-change:opacity}
.ctv-splash-out{opacity:0}
.ctv-splash-badge{position:relative;width:300px;height:300px;opacity:.01;
  will-change:transform,opacity}
.ctv-splash-bg{position:absolute;top:0;left:0;width:100%;height:100%;
  border-radius:72px;background:linear-gradient(135deg,#14b8a6,#4f46e5);
  box-shadow:0 30px 80px rgba(20,184,166,.35)}
.ctv-splash-part{position:absolute;top:40px;left:40px;width:220px;height:220px;
  opacity:.01;will-change:transform,opacity}
.ctv-splash-arc{transform:rotate(-140deg) scale(.7)}
.ctv-splash-play{transform-origin:53.1% 50%;transform:scale(.3)}
.ctv-splash-spark{transform-origin:78.9% 50%;transform:scale(.2) rotate(-90deg)}
.ctv-splash-name{margin-top:44px;color:#f1f5f9;font-size:56px;font-weight:600;
  letter-spacing:1px;opacity:.01;transform:translateY(24px);will-change:transform,opacity}
.ctv-splash-name span{color:#5eead4}
.ctv-splash-still .ctv-splash-badge,.ctv-splash-still .ctv-splash-part,
.ctv-splash-still .ctv-splash-name{opacity:1;transform:none}
.ctv-splash-run .ctv-splash-badge{animation:ctv-splash-badge .7s ${EASE_BACK} forwards}
.ctv-splash-run .ctv-splash-arc{animation:ctv-splash-arc .8s .3s ${EASE_OUT} forwards}
.ctv-splash-run .ctv-splash-play{animation:ctv-splash-pop .45s .85s ${EASE_BACK} forwards}
.ctv-splash-run .ctv-splash-spark{animation:ctv-splash-spark .6s 1.15s ${EASE_OUT} forwards}
.ctv-splash-run .ctv-splash-name{animation:ctv-splash-rise .6s 1.3s ${EASE_OUT} forwards}
@keyframes ctv-splash-badge{from{transform:scale(.6);opacity:.01}to{transform:scale(1);opacity:1}}
@keyframes ctv-splash-arc{to{transform:rotate(0) scale(1);opacity:1}}
@keyframes ctv-splash-pop{to{transform:scale(1);opacity:1}}
@keyframes ctv-splash-spark{to{transform:scale(1) rotate(0);opacity:1}}
@keyframes ctv-splash-rise{to{transform:translateY(0);opacity:1}}
`;

type AudioCtor = new () => AudioContext;
type OfflineCtor = new (
  channels: number,
  length: number,
  sampleRate: number
) => OfflineAudioContext;

/** The chime starts this long after the first frame, with the play icon. */
const CHIME_DELAY = 0.95;
const CHIME_RATE = 22050;
const CHIME_SECONDS = 1.6;

/** Adds a soft rising three-note chime to `ctx`, starting at `start`. */
function addChime(ctx: BaseAudioContext, start: number) {
  const master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);

  // E5, B5, E6: a bright open fifth and octave.
  [659.25, 987.77, 1318.51].forEach((freq, i) => {
    const at = start + i * 0.13;
    for (const [type, level] of [
      ['sine', 1],
      ['triangle', 0.25]
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + 1.2);
    }
  });
}

/**
 * Renders the chime ahead of time, so playing it is a single buffer and
 * the TV does not synthesize it while the animation runs. Resolves to null
 * if it cannot be rendered.
 */
export function renderChime(
  Offline: OfflineCtor | undefined = (window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: OfflineCtor })
      .webkitOfflineAudioContext) as OfflineCtor | undefined
): Promise<AudioBuffer | null> {
  if (!Offline) return Promise.resolve(null);
  try {
    const ctx = new Offline(
      1,
      Math.ceil(CHIME_RATE * CHIME_SECONDS),
      CHIME_RATE
    );
    addChime(ctx, 0);
    return Promise.resolve(ctx.startRendering()).catch((error: unknown) => {
      reportError('startup sound', error);
      return null;
    });
  } catch (error) {
    reportError('startup sound', error);
    return Promise.resolve(null);
  }
}

/**
 * Opens the audio output and wakes it with an inaudible sound. The TV
 * stalls the animation for a moment when its audio output starts, so this
 * runs before the first frame is painted. Returns null if audio failed.
 */
export function openAudio(
  Ctor: AudioCtor | undefined = (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtor })
      .webkitAudioContext) as AudioCtor | undefined
): AudioContext | null {
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    void ctx.resume?.()?.catch?.(() => {});
    try {
      const length = Math.ceil(ctx.sampleRate * 0.3);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 1e-4;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (error) {
      reportError('startup sound', error);
    }
    // Closed after the chime; this is a fallback if it never plays.
    setTimeout(() => {
      void ctx.close?.()?.catch?.(() => {});
    }, SPLASH_MAX_MS + 3500);
    return ctx;
  } catch (error) {
    reportError('startup sound', error);
    return null;
  }
}

/**
 * Plays the chime: the pre-rendered one when `rendered` gives a buffer,
 * otherwise synthesized live. Uses the output from `openAudio` when given.
 * Returns false if audio failed.
 */
export function playChime(
  Ctor: AudioCtor | undefined = (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtor })
      .webkitAudioContext) as AudioCtor | undefined,
  rendered: Promise<AudioBuffer | null> = Promise.resolve(null),
  opened: AudioContext | null = null
): boolean {
  if (!opened && !Ctor) return false;
  try {
    const ctx = opened ?? new Ctor!();
    void ctx.resume?.()?.catch?.(() => {});
    const start = ctx.currentTime + CHIME_DELAY;
    const play = (buffer: AudioBuffer | null) => {
      try {
        if (!buffer) {
          addChime(ctx, start);
          return;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(Math.max(start, ctx.currentTime));
      } catch (error) {
        reportError('startup sound', error);
      }
    };
    rendered.then(play, () => play(null));
    setTimeout(() => {
      void ctx.close?.()?.catch?.(() => {});
    }, 3500);
    return true;
  } catch (error) {
    reportError('startup sound', error);
    return false;
  }
}

interface SplashOptions {
  /** Whether YouTube has painted its interface. */
  appReady?: () => boolean;
  sound?: () => void;
  /** Show the last frame without animation or sound. */
  still?: boolean;
  /** Called once the parts stop moving (or the splash is hidden). */
  onMotionEnd?: () => void;
}

/** Shows the startup animation. Returns a function that hides it. */
export function showSplash(
  doc: Document = document,
  {
    appReady = () => !!doc.querySelector('ytlr-app'),
    sound = () => playChime(),
    still = false,
    onMotionEnd = () => {}
  }: SplashOptions = {}
): () => void {
  const root = doc.documentElement;
  const style = doc.createElement('style');
  style.textContent = STYLE;
  const splash = doc.createElement('div');
  splash.className = still ? 'ctv-splash ctv-splash-still' : 'ctv-splash';
  splash.innerHTML = `<div class="ctv-splash-badge"><div class="ctv-splash-bg"></div>${MARK}</div>
    <div class="ctv-splash-name">ClearTube <span>TV</span></div>`;
  root.appendChild(style);
  root.appendChild(splash);

  // The TV paints nothing while YouTube's scripts are parsed, so the
  // animation, the sound and the minimum time start with the first frame.
  let started = Number.POSITIVE_INFINITY;
  const created = Date.now();
  let done = false;
  let moving = true;
  const motionEnded = () => {
    if (!moving) return;
    moving = false;
    try {
      onMotionEnd();
    } catch (error) {
      reportError('startup animation', error);
    }
  };

  const hide = () => {
    if (done) return;
    done = true;
    motionEnded();
    clearInterval(poll);
    doc.removeEventListener('keydown', hide, true);
    splash.classList.add('ctv-splash-out');
    setTimeout(() => {
      splash.remove();
      style.remove();
    }, FADE_MS);
  };

  const poll = setInterval(() => {
    try {
      const elapsed = Date.now() - started;
      if (elapsed >= SPLASH_MOTION_MS) motionEnded();
      if (
        Date.now() - created >= SPLASH_MAX_MS ||
        (elapsed >= SPLASH_MS && appReady())
      ) {
        hide();
      }
    } catch (error) {
      reportError('startup animation', error);
      hide();
    }
  }, 100);
  doc.addEventListener('keydown', hide, true);

  const raf =
    window.requestAnimationFrame?.bind(window) ||
    ((cb: () => void) => setTimeout(cb, 16));
  if (still) {
    // Already played: only covers YouTube until it is ready.
    started = Date.now() - SPLASH_MS;
    motionEnded();
    return hide;
  }
  raf(() => {
    if (done) return;
    started = Date.now();
    splash.classList.add('ctv-splash-run');
    try {
      sound();
    } catch (error) {
      reportError('startup sound', error);
    }
  });
  return hide;
}

declare global {
  interface Window {
    /** Set when the loader page already played the startup animation. */
    ctvSplashPlayed?: boolean;
  }
}

/** Loads the name's font; resolves anyway after `maxMs` or on failure. */
export function loadSplashFont(maxMs = 400): Promise<void> {
  try {
    if (typeof FontFace === 'undefined' || !document.fonts) {
      return Promise.resolve();
    }
    const face = new FontFace(SPLASH_FONT_FAMILY, `url(${SPLASH_FONT_URL})`, {
      weight: '600'
    });
    document.fonts.add(face);
    return Promise.race([
      face.load().then(
        () => {},
        (error: unknown) => reportError('startup animation font', error)
      ),
      new Promise<void>((resolve) => setTimeout(resolve, maxMs))
    ]);
  } catch (error) {
    reportError('startup animation font', error);
    return Promise.resolve();
  }
}

export interface LoaderSplash {
  /** Resolves once the parts stop moving (at once if it does not play). */
  motion: Promise<void>;
  /** Removes it, e.g. to show an error. */
  hide: () => void;
  /**
   * Shows the last frame on the page that replaces the loader page. Must
   * run in the same task as document.write, before the TV paints.
   */
  cover: () => void;
}

/**
 * Plays the startup animation on the loader page, before YouTube is
 * written, so YouTube's loading never competes with it.
 */
export function startLoaderSplash(): LoaderSplash {
  let release = () => {};
  const motion = new Promise<void>((resolve) => (release = resolve));
  let hideAnimation = () => {};
  let cancelled = false;
  let played = false;
  const splash: LoaderSplash = {
    motion,
    hide: () => {
      cancelled = true;
      hideAnimation();
      release();
    },
    cover: () => {
      try {
        if (played && !cancelled) showSplash(document, { still: true });
      } catch (error) {
        reportError('startup animation', error);
      }
    }
  };
  try {
    if (!configRead('startupAnimation')) {
      release();
      return splash;
    }
    const chime = renderChime();
    const audio = openAudio();
    void loadSplashFont().then(() => {
      try {
        if (cancelled) return;
        hideAnimation = showSplash(document, {
          // The loader page is replaced by YouTube; `cover` takes over.
          appReady: () => false,
          sound: () => playChime(undefined, chime, audio),
          onMotionEnd: release
        });
        played = true;
        window.ctvSplashPlayed = true;
      } catch (error) {
        reportError('startup animation', error);
        release();
      }
    });
  } catch (error) {
    reportError('startup animation', error);
    release();
  }
  return splash;
}

export function startSplash() {
  try {
    if (window.top !== window.self) return;
    if (!configRead('startupAnimation')) return;
    if (window.ctvSplashPlayed) {
      // The loader normally covers YouTube already; this is a fallback.
      if (!document.querySelector('.ctv-splash')) {
        showSplash(document, { still: true });
      }
      return;
    }
    const chime = renderChime();
    const audio = openAudio();
    showSplash(document, {
      sound: () => playChime(undefined, chime, audio)
    });
  } catch (error) {
    reportError('startup animation', error);
  }
}
