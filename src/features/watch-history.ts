// Watch history for the signed-in account.
//
// YouTube records a watched video through two pings, /api/stats/playback
// and /api/stats/watchtime. Its player only adds the account token to them
// when the page itself is served over https; ClearTube TV runs from file://,
// so the pings went out without it and the videos never reached the
// account's history.
//
// The pings are sent as images. While "Save watch history" is on, each one
// is sent instead as a request carrying the token YouTube uses for its own
// API requests. If there is no token yet or the request fails, the original
// ping is sent as before.

import { configRead } from '../core/config';
import { guard, reportError } from '../core/safe';

const STATS_PING =
  /^(?:https:)?\/\/www\.youtube\.com\/api\/stats\/(?:playback|watchtime)\?/;

/** 1x1 GIF, so the ping image still fires its load event. */
const BLANK_GIF =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function isHistoryPing(url: string): boolean {
  return STATS_PING.test(url);
}

/** Whether a request header carries the account token. */
export function accountToken(name: string, value: string): string | null {
  return /^authorization$/i.test(name) && /^Bearer \S+$/.test(value)
    ? value
    : null;
}

interface HistoryOptions {
  enabled?: () => boolean;
}

export function installWatchHistory(
  win: Window & typeof globalThis = window,
  {
    enabled = () => configRead('saveWatchHistory') !== false
  }: HistoryOptions = {}
) {
  let token: string | null = null;

  // Remember the newest token YouTube sends with its own requests.
  const xhrProto = win.XMLHttpRequest.prototype;
  const setRequestHeader = xhrProto.setRequestHeader;
  xhrProto.setRequestHeader = function (name: string, value: string) {
    try {
      token = accountToken(String(name), String(value)) ?? token;
    } catch (error) {
      reportError('watch history (token)', error);
    }
    return setRequestHeader.call(this, name, value);
  };

  const srcProperty = Object.getOwnPropertyDescriptor(
    win.HTMLImageElement.prototype,
    'src'
  );
  const setSrc = srcProperty?.set;
  if (!srcProperty || !setSrc) {
    reportError('watch history', new Error('image src cannot be hooked'));
    return;
  }

  const sendWithToken = (
    image: HTMLImageElement,
    url: string,
    auth: string
  ) => {
    const request = new win.XMLHttpRequest();
    request.open('GET', url.startsWith('//') ? `https:${url}` : url);
    request.withCredentials = true;
    setRequestHeader.call(request, 'Authorization', auth);
    request.onloadend = guard('watch history', () => {
      const sent = request.status >= 200 && request.status < 300;
      // On failure, fall back to the original ping.
      setSrc.call(image, sent ? BLANK_GIF : url);
    });
    request.send();
  };

  Object.defineProperty(win.HTMLImageElement.prototype, 'src', {
    ...srcProperty,
    set(this: HTMLImageElement, value: string) {
      try {
        const url = String(value);
        if (token && isHistoryPing(url) && enabled()) {
          sendWithToken(this, url, token);
          return;
        }
      } catch (error) {
        reportError('watch history', error);
      }
      setSrc.call(this, value);
    }
  });
}

installWatchHistory();
