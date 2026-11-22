import './ui/debug-console';
import 'whatwg-fetch';
import './polyfills/domrect-polyfill';

import { handleLaunch } from './core/utils';
import { installGlobalErrorHandlers, startFeature } from './core/safe';
import { startSplash } from './ui/splash';

installGlobalErrorHandlers();
startSplash();

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

import './hooks';
import './hooks/json-parse';
import './styles/font-fix.css';
import './styles/yt-fixes.css';

// Each feature loads in isolation: if one fails, it is reported in the
// debug console (Red button) and the others keep working. "eager" keeps
// them in this bundle; they still load before YouTube's own scripts run.
const features: [string, () => Promise<unknown>][] = [
  ['app-api', () => import(/* webpackMode: "eager" */ './app_api/index')],
  ['adblock', () => import(/* webpackMode: "eager" */ './features/adblock.js')],
  [
    'inline-ads',
    () => import(/* webpackMode: "eager" */ './hooks/json-stringify')
  ],
  ['shorts', () => import(/* webpackMode: "eager" */ './features/shorts')],
  ['dearrow', () => import(/* webpackMode: "eager" */ './features/dearrow')],
  [
    'previews',
    () => import(/* webpackMode: "eager" */ './features/disable-previews')
  ],
  [
    'sponsorblock',
    () => import(/* webpackMode: "eager" */ './features/sponsorblock.js')
  ],
  ['ui', () => import(/* webpackMode: "eager" */ './ui/ui.js')],
  [
    'guide-entry',
    () => import(/* webpackMode: "eager" */ './features/guide-entry')
  ],
  [
    'thumbnails',
    () => import(/* webpackMode: "eager" */ './features/thumbnail-quality')
  ],
  [
    'screensaver',
    () => import(/* webpackMode: "eager" */ './features/screensaver-fix')
  ],
  ['clock', () => import(/* webpackMode: "eager" */ './features/watch.js')],
  [
    'video-quality',
    () => import(/* webpackMode: "eager" */ './features/video-quality')
  ],
  [
    'playback-speed',
    () => import(/* webpackMode: "eager" */ './features/playback-speed')
  ],
  [
    'language-fix',
    () => import(/* webpackMode: "eager" */ './features/lang-settings-fix')
  ],
  [
    'endscreen',
    () => import(/* webpackMode: "eager" */ './features/remove-endscreen')
  ],
  [
    'navigation',
    () => import(/* webpackMode: "eager" */ './hooks/app-navigation')
  ],
  [
    'webos-cast',
    () => import(/* webpackMode: "eager" */ './features/block-webos-cast')
  ],
  [
    'account-select',
    () => import(/* webpackMode: "eager" */ './features/auto-account-select')
  ]
];

for (const [name, load] of features) void startFeature(name, load);
