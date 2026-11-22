// Tizen standalone loader script for YouTube TV

declare global {
  interface Window {
    tizen?: any;
    tizenLoaderExecuted?: boolean;
    tizenInitialURL?: string;
    ytaf_showOptionsPanel?: (visible?: boolean) => void;
    ytaf_reloadApp?: () => void;
  }
}

import { startLoaderSplash } from '../ui/splash';
import { getProxyIP, discoverProxyIP } from './proxy-config';
import {
  buildLocalSearch,
  fixYouTubeUrl,
  localAppBase,
  localAppUrl
} from './tizen-url';

function showProxyError() {
  if ((window as any).proxyErrorShown) return;
  (window as any).proxyErrorShown = true;

  const inject = () => {
    if (!document.body) {
      setTimeout(inject, 500);
      return;
    }
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #181818;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.8);
      color: #fff;
    `;
    modal.innerHTML = `
      <h1 style="margin: 0 0 20px 0; font-size: 26px; font-weight: 500; color: #ff4e45;">Proxy Unreachable</h1>
      <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #aaa;">
        This older TV requires a proxy server to bypass Google's API firewall. We couldn't find one on your network!
      </p>
      <div style="background: #212121; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: left; border: 1px solid rgba(255,255,255,0.05);">
        <p style="margin: 0 0 12px 0; font-size: 15px; color: #ddd;">1. Run the Node.js proxy server on any PC on your local network.</p>
        <p style="margin: 0; font-size: 15px; color: #ddd;">2. The app will auto-detect it on next launch.</p>
      </div>
      <p style="font-size: 14px; color: #888; margin-bottom: 30px; line-height: 1.4;">
        (You can find the proxy server script and more info on the project's GitHub page)
      </p>
      <button id="yt-proxy-dismiss" style="
        background: #f1f1f1;
        color: #0f0f0f;
        border: none;
        border-radius: 18px;
        padding: 10px 24px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
      ">Understood</button>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#yt-proxy-dismiss') as HTMLButtonElement;
    if (btn) {
      btn.focus();
      btn.style.border = '2px solid transparent';
      btn.onfocus = () => (btn.style.border = '2px solid #3ea6ff');
      btn.onblur = () => (btn.style.border = '2px solid transparent');
      btn.onclick = () => overlay.remove();
      btn.onkeydown = (e) => {
        if (e.key === 'Enter') overlay.remove();
      };
    }
  };
  inject();
}

function showProxyModeNotice() {
  const timer = setInterval(() => {
    if (!document.body) return;
    clearInterval(timer);
    const el = document.createElement('div');
    el.style.cssText =
      'position: fixed; bottom: 20px; right: 20px; background: rgba(30, 30, 30, 0.85); color: #aaa; padding: 8px 16px; border-radius: 8px; z-index: 2147483647; font-family: sans-serif; font-size: 13px; pointer-events: none; border: 1px solid rgba(255,255,255,0.08);';
    el.innerText = 'Proxy mode active';
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.6s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 600);
    }, 3000);
  }, 500);
}

export async function runTizenLoader() {
  console.info('[TizenLoader] Starting loader...');

  // 1. Setup global flags
  window.tizenLoaderExecuted = false;

  window.ytaf_reloadApp = () => {
    console.info('[TizenLoader] Reloading app context...');
    window.location.href = localAppUrl(window.location.href);
  };

  // Auto-discover proxy for older Tizen TVs before patching network calls
  const isOldTizenEarly =
    navigator.userAgent.includes('Tizen 5.') ||
    navigator.userAgent.includes('Tizen 4.') ||
    navigator.userAgent.includes('Tizen 3.');
  if (isOldTizenEarly) {
    console.info('[TizenLoader] Old Tizen detected, discovering proxy...');

    // Show a search indicator while scanning the subnet
    const searchOverlay = document.createElement('div');
    searchOverlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #0f0f0f;
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
    `;
    searchOverlay.innerHTML = `
      <div style="
        width: 40px; height: 40px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: #3ea6ff;
        border-radius: 50%;
        animation: ytaf-spin 0.8s linear infinite;
        margin-bottom: 24px;
      "></div>
      <p style="color: #aaa; font-size: 16px; margin: 0;">Searching for proxy server on your network...</p>
      <style>@keyframes ytaf-spin { to { transform: rotate(360deg); } }</style>
    `;
    (document.body || document.documentElement).appendChild(searchOverlay);

    await discoverProxyIP();
    console.info(`[TizenLoader] Proxy IP resolved to: ${getProxyIP()}`);

    searchOverlay.remove();
  }

  try {
    const originalReload = Location.prototype.reload;
    Location.prototype.reload = function () {
      console.info('[TizenLoader] Intercepted Location.prototype.reload()');
      if (window.tizen) {
        window.ytaf_reloadApp!();
      } else {
        originalReload.call(this);
      }
    };
  } catch (e) {
    console.warn(
      '[TizenLoader] Failed to monkey-patch Location.prototype.reload',
      e
    );
  }

  // Helper to log to debug console safely
  const logToDebug = (msg: string) => {
    if ((window as any).debugConsole) {
      (window as any).debugConsole.log(msg);
    } else {
      console.debug(msg);
    }
  };

  // Polyfill document.cookie for file:// protocol on older Tizen WebKit engines
  if (window.location.protocol === 'file:') {
    try {
      let cookieStore = '';
      // Try to load from localStorage if available
      try {
        cookieStore = window.localStorage.getItem('ytaf_cookie_polyfill') || '';
      } catch {
        // localStorage unavailable: start with an empty cookie jar.
      }

      Object.defineProperty(document, 'cookie', {
        get() {
          return cookieStore;
        },
        set(value) {
          if (!value) return;
          const newCookie = value.split(';')[0];
          const newKey = newCookie.split('=')[0].trim();

          let cookies = cookieStore ? cookieStore.split('; ') : [];
          // Remove old cookie with same key
          cookies = cookies.filter(
            (c) => (c.split('=')[0] ?? '').trim() !== newKey
          );
          cookies.push(newCookie.trim());

          cookieStore = cookies.join('; ');
          try {
            window.localStorage.setItem('ytaf_cookie_polyfill', cookieStore);
          } catch {
            // Quota exceeded or storage disabled: keep the in-memory value.
          }
        },
        configurable: true
      });
      logToDebug('[TizenLoader] Polyfilled document.cookie');
    } catch (e) {
      logToDebug('[TizenLoader] Failed to polyfill document.cookie: ' + e);
    }
  }

  // 2. Rewrite request URLs. YouTube builds broken URLs on file:// (empty
  // location.host) and old Tizen versions route youtubei through a proxy.
  const needsProxy = /Tizen [345]\./.test(navigator.userAgent);
  const rewriteUrl = (raw: string): string => {
    const url = fixYouTubeUrl(raw);
    const proxyIP = needsProxy ? getProxyIP() : null;
    if (proxyIP && url.includes('/youtubei/')) {
      return `http://${proxyIP}:3000/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  if (needsProxy) showProxyModeNotice();

  const originalFetch = window.fetch;
  window.fetch = function (
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (typeof input === 'string') {
      const url = rewriteUrl(input);
      if (url !== input) logToDebug(`[FETCH-REDIR] ${input} -> ${url}`);
      input = url;
    } else if (input instanceof URL) {
      input = new URL(rewriteUrl(input.toString()));
    } else if (input instanceof Request) {
      const url = rewriteUrl(input.url);
      if (url !== input.url) {
        logToDebug(`[FETCH-REDIR] ${input.url} -> ${url}`);
        input = new Request(url, input);
      }
    }
    return originalFetch.call(this, input, init);
  } as typeof window.fetch;

  // 3. Same rewrite for XMLHttpRequest
  const originalOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const raw = String(url);
    const urlStr = rewriteUrl(raw);
    if (urlStr !== raw) logToDebug(`[XHR-REDIR] ${method} ${raw} -> ${urlStr}`);
    else logToDebug(`[XHR] ${method} ${urlStr}`);

    this.addEventListener('load', () => {
      if (this.status >= 400) {
        logToDebug(`[XHR-FAIL] ${this.status} ${urlStr}`);
      }
    });
    this.addEventListener('error', () => {
      logToDebug(`[XHR-ERROR] ${urlStr}`);
      const proxyIP = getProxyIP();
      if (needsProxy && (!proxyIP || urlStr.includes(proxyIP))) {
        showProxyError();
      }
    });

    return (originalOpen as (...args: unknown[]) => void).call(
      this,
      method,
      urlStr,
      ...rest
    );
  } as typeof XMLHttpRequest.prototype.open;

  // 4. Monkey-patch Document.prototype.createElement to intercept relative script/image/video URLs
  const originalCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function (
    this: Document,
    tagName: string,
    options?: ElementCreationOptions
  ): HTMLElement {
    const element = originalCreateElement.call(this, tagName, options);
    const tag = tagName.toLowerCase();

    if (
      tag === 'script' ||
      tag === 'link' ||
      tag === 'img' ||
      tag === 'video' ||
      tag === 'audio' ||
      tag === 'source'
    ) {
      const resolveUrl = (val: any) => {
        if (
          typeof val === 'string' &&
          val &&
          !val.startsWith('http://') &&
          !val.startsWith('https://') &&
          !val.startsWith('file://') &&
          !val.startsWith('data:')
        ) {
          // If it references our local userScript or index, don't redirect it
          if (val.includes('userScript.js') || val.includes('index.js')) {
            return val;
          }
          return new URL(val, 'https://www.youtube.com').toString();
        }
        return val;
      };

      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function (name: string, value: string) {
        const attr = name.toLowerCase();
        if (attr === 'src' || attr === 'href') {
          value = resolveUrl(value);
        }
        return originalSetAttribute.call(this, name, value);
      };

      if (
        tag === 'script' ||
        tag === 'img' ||
        tag === 'video' ||
        tag === 'audio' ||
        tag === 'source'
      ) {
        Object.defineProperty(element, 'src', {
          get() {
            return element.getAttribute('src') || '';
          },
          set(value) {
            element.setAttribute('src', value);
          },
          configurable: true
        });
      }
      if (tag === 'link') {
        Object.defineProperty(element, 'href', {
          get() {
            return element.getAttribute('href') || '';
          },
          set(value) {
            element.setAttribute('href', value);
          },
          configurable: true
        });
      }
    }
    return element;
  } as any;

  // 5. Tizen Remote Key Registration
  if (window.tizen && window.tizen.tvinputdevice) {
    const tizenKeys = [
      'ColorF0Red',
      'ColorF1Green',
      'ColorF2Yellow',
      'ColorF3Blue',
      'MediaPlay',
      'MediaPause',
      'MediaPlayPause',
      'MediaStop',
      'MediaFastForward',
      'MediaRewind'
    ];
    tizenKeys.forEach((keyName) => {
      try {
        window.tizen.tvinputdevice.registerKey(keyName);
        console.debug('[TizenLoader] Registered key:', keyName);
      } catch (e) {
        console.warn('[TizenLoader] Failed to register key:', keyName, e);
      }
    });
  }

  // 6. Return / Back Key Mapping for remote control
  window.addEventListener('keydown', (evt: KeyboardEvent) => {
    if (evt.keyCode === 10009) {
      console.debug('[TizenLoader] Return/Back key intercepted.');

      // Check if options panel from UI is open
      const optionsContainer = document.querySelector(
        '#ytaf-options-overlay, .ytaf-ui-container'
      ) as HTMLElement;
      if (optionsContainer && optionsContainer.style.display !== 'none') {
        if (window.ytaf_showOptionsPanel) {
          window.ytaf_showOptionsPanel(false);
          evt.preventDefault();
          evt.stopPropagation();
          return;
        }
      }

      // Dispatch Escape key down to active element so YouTube TV UI handles it
      const escapeEvt = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true
      });
      const target = document.activeElement || document.body;
      target.dispatchEvent(escapeEvt);

      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  // 7. Load and Inject YouTube Leanback
  await fetchAndRewriteYoutube();
}

/** Longest wait for the startup animation before YouTube is written. */
const SPLASH_WAIT_MAX_MS = 3000;

/** Absolute URLs of the external scripts of a YouTube page. */
export function pageScripts(html: string): string[] {
  const urls: string[] = [];
  const re = /<script\s[^>]*?src="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      urls.push(
        new URL(match[1]!.replace(/&amp;/g, '&'), 'https://www.youtube.com/')
          .href
      );
    } catch {
      // Ignore addresses that cannot be parsed.
    }
  }
  return urls;
}

/** Starts downloading YouTube's scripts while the animation plays. */
function preloadScripts(html: string) {
  try {
    for (const href of pageScripts(html)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = href;
      document.head.appendChild(link);
    }
  } catch (error) {
    console.warn('[TizenLoader] Script preload failed:', error);
  }
}

function waitAtMost(promise: Promise<unknown>, ms: number) {
  return Promise.race([
    promise.catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, ms))
  ]);
}

async function fetchAndRewriteYoutube() {
  const targetUrlStr = window.tizenInitialURL || 'https://www.youtube.com/tv#/';
  const targetUrl = new URL(targetUrlStr);

  // We fetch without hash since hash is client-side only
  const fetchUrl = new URL(
    targetUrl.pathname + targetUrl.search,
    'https://www.youtube.com'
  );

  // The animation plays here, on the almost empty loader page, while
  // YouTube downloads; YouTube is written once its parts stop moving, so
  // its loading never competes with the animation.
  const splash = startLoaderSplash();

  try {
    console.info('[TizenLoader] Fetching YouTube from:', fetchUrl.toString());
    const response = await fetch(fetchUrl.toString(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Status: ' + response.status);

    let html = await response.text();
    console.info('[TizenLoader] Fetched HTML size:', html.length);
    preloadScripts(html);

    // Get current local path directory
    const localAppPath = localAppBase(window.location.href);
    const userScriptTag = `<script src="${localAppPath}webOSUserScripts/userScript.js?v=${Date.now()}"></script>`;
    const baseTag = '<base href="https://www.youtube.com/">';

    // Inject base href and our userScript at the very beginning of <head>
    html = html.replace('<head>', `<head>${baseTag}${userScriptTag}`);

    // YouTube reads its launch options from location.search, so expose the
    // launch query on the local page. env_hideWatermark hides the
    // "NO DEBUG ACCESS" watermark shown outside youtube.com.
    const localUrl =
      localAppUrl(window.location.href) +
      buildLocalSearch(targetUrl) +
      (targetUrl.hash || '#/');
    try {
      window.history.replaceState(null, '', localUrl);
    } catch (e) {
      console.warn('[TizenLoader] replaceState failed:', e);
      if (targetUrl.hash) window.location.hash = targetUrl.hash;
    }

    // Set loader executed flag
    window.tizenLoaderExecuted = true;

    await waitAtMost(splash.motion, SPLASH_WAIT_MAX_MS);

    // Rewrite document
    document.open();
    document.write(html);
    // In the same task, so the TV never paints the empty page.
    splash.cover();
    document.close();
  } catch (error) {
    console.error('[TizenLoader] Fetch failed:', error);
    splash.hide();
    showNetworkErrorUI();
  }
}

function showNetworkErrorUI() {
  // Clear body and insert error overlay
  document.body.innerHTML = `
    <div id="tizen-network-error" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: #0f0f0f; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 99999; box-sizing: border-box; padding: 2rem;">
      <div style="width: 6rem; height: 6rem; line-height: 6rem; border-radius: 50%; border: 0.4rem solid #ff4e45; color: #ff4e45; font-size: 4rem; font-weight: 700; text-align: center; margin-bottom: 1.5rem; animation: pulse 2s infinite ease-in-out;">!</div>
      <h1 style="font-size: 2.2rem; margin-bottom: 0.5rem; font-weight: 600; text-align: center;">Network Connection Error</h1>
      <p style="font-size: 1.1rem; color: #aaa; margin-bottom: 2.5rem; text-align: center; max-width: 500px; line-height: 1.5;">Unable to load YouTube. Please verify that your TV is connected to the internet and check your network settings.</p>
      <button id="retry-btn" style="background-color: #ff0000; color: #fff; border: none; padding: 1rem 3rem; font-size: 1.2rem; font-weight: bold; border-radius: 50px; cursor: pointer; outline: none; box-shadow: 0 4px 20px rgba(255, 0, 0, 0.4); transform: scale(1); transition: all 0.2s ease;">Retry Connection</button>
      <p id="retry-countdown" style="margin-top: 1.5rem; font-size: 1rem; color: #666; text-align: center;">Retrying automatically in 5 seconds...</p>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        #retry-btn:focus, #retry-btn:hover {
          background-color: #cc0000;
          transform: scale(1.08);
          box-shadow: 0 6px 25px rgba(255, 0, 0, 0.6);
        }
      </style>
    </div>
  `;

  const retryBtn = document.getElementById('retry-btn') as HTMLButtonElement;
  if (retryBtn) {
    retryBtn.focus();
    retryBtn.addEventListener('click', () => {
      document.body.innerHTML =
        '<div style="background-color:#0f0f0f;color:#fff;width:100vw;height:100vh;display:flex;justify-content:center;align-items:center;font-size:1.5rem;">Connecting...</div>';
      setTimeout(fetchAndRewriteYoutube, 500);
    });
  }

  let secondsLeft = 5;
  const countdownText = document.getElementById(
    'retry-countdown'
  ) as HTMLParagraphElement;
  const timer = setInterval(() => {
    secondsLeft--;
    if (countdownText) {
      countdownText.textContent = `Retrying automatically in ${secondsLeft} seconds...`;
    }
    if (secondsLeft <= 0) {
      clearInterval(timer);
      if (document.getElementById('tizen-network-error')) {
        document.body.innerHTML =
          '<div style="background-color:#0f0f0f;color:#fff;width:100vw;height:100vh;display:flex;justify-content:center;align-items:center;font-size:1.5rem;">Connecting...</div>';
        fetchAndRewriteYoutube();
      }
    }
  }, 1000);
}
