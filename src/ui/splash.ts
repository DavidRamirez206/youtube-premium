// Startup animation: the ClearTube TV mark draws itself with a short
// synthesized chime while YouTube loads underneath. It is skipped with any
// key, never blocks YouTube, and removes itself even if something fails.

import { configRead } from '../core/config';
import { reportError } from '../core/safe';

/** Length of the animation before it may fade out. */
export const SPLASH_MS = 2600;
/** The splash is removed after this even if YouTube has not painted. */
export const SPLASH_MAX_MS = 7000;
const FADE_MS = 400;

const MARK = `
<svg class="ctv-splash-mark" viewBox="0 0 512 512" width="220" height="220" aria-hidden="true">
  <path class="ctv-splash-arc" d="M370.9 159.6A150 150 0 1 0 370.9 352.4" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round"/>
  <path class="ctv-splash-play" d="M226 200v112l92-56z" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>
  <path class="ctv-splash-spark" d="M404 222l9 25 25 9-25 9-9 25-9-25-25-9 25-9z" fill="#fff"/>
</svg>`;

const STYLE = `
.ctv-splash{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#0b0f14;background:radial-gradient(circle at 50% 45%,#13303a 0,#0b0f14 60%);
  font-family:'YouTube Noto',Roboto,Arial,sans-serif;pointer-events:none;
  opacity:1;transition:opacity ${FADE_MS}ms ease-out}
.ctv-splash-out{opacity:0}
.ctv-splash-badge{width:300px;height:300px;border-radius:72px;display:flex;
  align-items:center;justify-content:center;
  background:linear-gradient(135deg,#14b8a6,#4f46e5);
  box-shadow:0 30px 80px rgba(20,184,166,.35);opacity:0}
.ctv-splash-run .ctv-splash-badge{animation:ctv-splash-badge .7s cubic-bezier(.2,1.4,.4,1) both}
.ctv-splash-arc{stroke-dasharray:760;stroke-dashoffset:760}
.ctv-splash-run .ctv-splash-arc{animation:ctv-splash-draw .8s .35s ease-out forwards}
.ctv-splash-play{transform-origin:272px 256px;transform:scale(0)}
.ctv-splash-run .ctv-splash-play{animation:ctv-splash-pop .35s 1s cubic-bezier(.2,1.6,.4,1) forwards}
.ctv-splash-spark{transform-origin:404px 256px;opacity:0}
.ctv-splash-run .ctv-splash-spark{animation:ctv-splash-spark .6s 1.3s ease-out forwards}
.ctv-splash-name{margin-top:44px;color:#f1f5f9;font-size:56px;font-weight:600;
  letter-spacing:1px;opacity:0}
.ctv-splash-run .ctv-splash-name{animation:ctv-splash-rise .5s 1.45s ease-out forwards}
.ctv-splash-name span{color:#5eead4}
@keyframes ctv-splash-badge{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes ctv-splash-draw{to{stroke-dashoffset:0}}
@keyframes ctv-splash-pop{to{transform:scale(1)}}
@keyframes ctv-splash-spark{0%{opacity:0;transform:scale(.2) rotate(-45deg)}
  60%{opacity:1;transform:scale(1.3) rotate(10deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes ctv-splash-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
`;

type AudioCtor = new () => AudioContext;

/** Plays a soft rising three-note chime. Returns false if audio failed. */
export function playChime(
  Ctor: AudioCtor | undefined = (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtor })
      .webkitAudioContext) as AudioCtor | undefined
): boolean {
  if (!Ctor) return false;
  try {
    const ctx = new Ctor();
    void ctx.resume?.()?.catch?.(() => {});
    const start = ctx.currentTime + 0.95;
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
}

/** Shows the startup animation. Returns a function that hides it. */
export function showSplash(
  doc: Document = document,
  {
    appReady = () => !!doc.querySelector('ytlr-app'),
    sound = () => playChime()
  }: SplashOptions = {}
): () => void {
  const root = doc.documentElement;
  const style = doc.createElement('style');
  style.textContent = STYLE;
  const splash = doc.createElement('div');
  splash.className = 'ctv-splash';
  splash.innerHTML = `<div class="ctv-splash-badge">${MARK}</div>
    <div class="ctv-splash-name">ClearTube <span>TV</span></div>`;
  root.appendChild(style);
  root.appendChild(splash);

  // The TV paints nothing while YouTube's scripts are parsed, so the
  // animation, the sound and the minimum time start with the first frame.
  let started = Number.POSITIVE_INFINITY;
  const created = Date.now();
  let done = false;

  const hide = () => {
    if (done) return;
    done = true;
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

export function startSplash() {
  try {
    if (window.top !== window.self) return;
    if (!configRead('startupAnimation')) return;
    showSplash();
  } catch (error) {
    reportError('startup animation', error);
  }
}
