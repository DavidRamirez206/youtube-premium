import './ui/debug-console';
import 'whatwg-fetch';
import './polyfills/domrect-polyfill';

import { handleLaunch } from './core/utils';

document.addEventListener(
  'webOSRelaunch',
  (evt) => {
    console.info('RELAUNCH:', evt, window.launchParams);
    handleLaunch((evt as CustomEvent).detail);
  },
  true
);

if (typeof window !== 'undefined') {
  window.addEventListener('appcontrol', () => {
    try {
      const reqAppControl = window.tizen?.application
        ?.getCurrentApplication()
        ?.getRequestedAppControl();
      if (reqAppControl && reqAppControl.appControl) {
        const appControl = reqAppControl.appControl;
        const params: Record<string, any> = {};
        if (appControl.data) {
          appControl.data.forEach((item: any) => {
            params[item.key] =
              item.value && item.value.length === 1
                ? item.value[0]
                : item.value;
          });
        }
        console.info('[TizenLoader] appcontrol relaunch received:', params);
        handleLaunch(params);
      }
    } catch (e) {
      console.error('Tizen appcontrol relaunch error:', e);
    }
  });
}

import './app_api/index';
import './features/adblock.js';
import './hooks/json-stringify';
import './features/shorts.js';
import './features/sponsorblock.js';
import './ui/ui.js';
import './styles/font-fix.css';
import './features/thumbnail-quality';
import './features/screensaver-fix';
import './styles/yt-fixes.css';
import './features/watch.js';
import './features/video-quality';
import './features/playback-speed';
import './features/lang-settings-fix';
import './features/remove-endscreen';
import './hooks';
import './hooks/app-navigation';
import './features/block-webos-cast';
import './features/auto-account-select';
