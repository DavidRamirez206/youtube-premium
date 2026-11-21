import './debug-console';
import 'whatwg-fetch';
import './domrect-polyfill';

import { handleLaunch } from './utils';

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
import './adblock.js';
import './hooks/json-stringify';
import './shorts.js';
import './sponsorblock.js';
import './ui.js';
import './font-fix.css';
import './thumbnail-quality';
import './screensaver-fix';
import './yt-fixes.css';
import './watch.js';
import './video-quality';
import './lang-settings-fix';
import './remove-endscreen';
import './hooks';
import './block-webos-cast';
import './auto-account-select';
