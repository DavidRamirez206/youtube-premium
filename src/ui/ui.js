import '../polyfills/spatial-navigation-polyfill.js';
import { configAddChangeListener, configRead } from '../core/config.js';
import './ui.css';
import { requireElement } from '../player_api/helpers';
import { createSettingsMenu } from './settings-menu.js';
import { onBodyReady } from '../core/dom';

// We handle key events ourselves.
window.__spatialNavigation__.keyMode = 'NONE';

const colorCodeMap = new Map([
  [403, 'red'],

  [404, 'green'],
  [172, 'green'],

  [405, 'yellow'],
  [170, 'yellow'],

  [406, 'blue'],
  [167, 'blue'],
  [191, 'blue']
]);

const colorKeyNameMap = new Map([
  ['colorf0red', 'red'],
  ['red', 'red'],
  ['xf86red', 'red'],
  ['colorf1green', 'green'],
  ['green', 'green'],
  ['xf86green', 'green'],
  ['colorf2yellow', 'yellow'],
  ['yellow', 'yellow'],
  ['xf86yellow', 'yellow'],
  ['colorf3blue', 'blue'],
  ['blue', 'blue'],
  ['xf86blue', 'blue']
]);

/**
 * Returns the name of the color button associated with a code or null if not a color button.
 * @param {KeyboardEvent} evt Keyboard event from event listener
 * @returns {string | null} Color name or null
 */
function getKeyColor(evt) {
  const keyCode = evt.keyCode || evt.which;
  if (colorCodeMap.has(keyCode)) {
    return colorCodeMap.get(keyCode);
  }

  const keyName = String(evt.key || '').toLowerCase();
  if (keyName && colorKeyNameMap.has(keyName)) {
    return colorKeyNameMap.get(keyName);
  }

  const codeName = String(evt.code || '').toLowerCase();
  if (codeName && colorKeyNameMap.has(codeName)) {
    return colorKeyNameMap.get(codeName);
  }

  return null;
}

const settingsMenu = createSettingsMenu();
onBodyReady((body) => body.appendChild(settingsMenu.element));

function showOptionsPanel(visible) {
  visible ??= true;

  if (visible && !settingsMenu.isOpen()) {
    // Keep the menu above anything YouTube added since it was mounted.
    document.body.appendChild(settingsMenu.element);
    settingsMenu.open();
  } else if (!visible && settingsMenu.isOpen()) {
    if (settingsMenu.close()) {
      showNotification('Applying settings...', 1200, 'green');
      setTimeout(() => {
        if (window.ytaf_reloadApp) {
          window.ytaf_reloadApp();
        } else {
          window.location.reload();
        }
      }, 200);
    }
  }
}

window.ytaf_showOptionsPanel = showOptionsPanel;

let ytafInspectorEnabled = false;
let ytafInspectorContainer = null;

function toggleInspector() {
  ytafInspectorEnabled = !ytafInspectorEnabled;
  if (!ytafInspectorEnabled) {
    if (ytafInspectorContainer) {
      ytafInspectorContainer.remove();
      ytafInspectorContainer = null;
    }
    showNotification('Overlay Inspector Disabled', 2000, 'yellow');
    return;
  }

  showNotification('Overlay Inspector Enabled', 2000, 'yellow');

  ytafInspectorContainer = document.createElement('div');
  ytafInspectorContainer.id = 'ytaf-inspector-container';
  ytafInspectorContainer.style.cssText =
    'position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';
  document.body.appendChild(ytafInspectorContainer);

  const result = [];
  function getAllElements(root) {
    if (!root) return;
    const elements = root.querySelectorAll('*');
    elements.forEach((el) => {
      result.push(el);
      if (el.shadowRoot) {
        getAllElements(el.shadowRoot);
      }
    });
  }
  getAllElements(document.documentElement);

  // We only want overlays (absolute, fixed) that are visible.
  result.forEach((el) => {
    if (el.id === 'ytaf-inspector-container') return;
    if (el.id === 'ytaf-debug-console') return;
    if (el.id === 'ytaf-options-overlay') return;

    try {
      const style = window.getComputedStyle(el);
      if (
        (style.position === 'absolute' || style.position === 'fixed') &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      ) {
        const rect = el.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.width < window.innerWidth * 0.95 &&
          rect.height < window.innerHeight * 0.95
        ) {
          // Draw box
          const box = document.createElement('div');
          box.style.cssText = `
            position: absolute;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 2px solid yellow;
            pointer-events: none;
            box-sizing: border-box;
            background-color: rgba(255, 255, 0, 0.1);
          `;

          const label = document.createElement('div');
          let name = el.tagName.toLowerCase();
          if (el.id) name += '#' + el.id;
          if (el.className && typeof el.className === 'string')
            name += '.' + el.className.trim().replace(/\s+/g, '.');

          label.innerText = name;
          label.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            background: yellow;
            color: black;
            font-size: 14px;
            font-family: monospace;
            padding: 2px 4px;
            white-space: nowrap;
          `;

          box.appendChild(label);
          ytafInspectorContainer.appendChild(box);
        }
      }
    } catch {
      // Elements can be detached while the inspector walks the tree.
    }
  });
}

/**
 * Key codes whose keyup (and keypress) must not reach YouTube because their
 * keydown was consumed by us. Without this, Back closes the menu on keydown
 * and YouTube handles the keyup as "back" too, which exits the app.
 * @type {Set<number>}
 */
const consumedKeys = new Set();

/** @param {KeyboardEvent} evt */
function swallowKey(evt) {
  const keyCode = evt.keyCode || evt.which;
  if (evt.type === 'keydown') consumedKeys.add(keyCode);
  else if (evt.type === 'keyup') consumedKeys.delete(keyCode);
  evt.preventDefault();
  evt.stopPropagation();
  evt.stopImmediatePropagation();
  return false;
}

const eventHandler = (evt) => {
  const keyCode = evt.keyCode || evt.which;
  const keyColor = getKeyColor(evt);

  if (evt.type !== 'keydown' && consumedKeys.has(keyCode)) {
    return swallowKey(evt);
  }

  if (settingsMenu.isOpen()) {
    // While the menu is open, every key belongs to it.
    if (evt.type === 'keydown') {
      if (keyColor === 'green' || keyCode === 27 || keyCode === 10009) {
        showOptionsPanel(false);
      } else if (keyCode === 38) {
        settingsMenu.up();
      } else if (keyCode === 40) {
        settingsMenu.down();
      } else if (keyCode === 13 || keyCode === 32) {
        settingsMenu.activate();
      } else if (keyCode === 37) {
        settingsMenu.left();
      } else if (keyCode === 39) {
        settingsMenu.right();
      }
    }
    return swallowKey(evt);
  }

  // Normal mode
  if (keyColor === 'green') {
    if (evt.type === 'keydown') {
      showOptionsPanel(!settingsMenu.isOpen());
    }
    return swallowKey(evt);
  } else if (keyColor === 'red') {
    if (evt.type === 'keydown') {
      const consoleElm = document.getElementById('ytaf-debug-console');
      if (consoleElm) {
        if (consoleElm.style.display === 'none') {
          consoleElm.style.display = 'block';
          showNotification('Debug console shown', 2000, 'red');
        } else {
          consoleElm.style.display = 'none';
          showNotification('Debug console hidden', 2000, 'red');
        }
      }
    }
    return swallowKey(evt);
  } else if (keyColor === 'blue') {
    if (evt.type === 'keydown') {
      const video = getActiveVideo();
      if (video) {
        initAudioOnlyToggle(video);
      } else {
        showNotification('Audio-only mode: play a video first', 2000, 'blue');
      }
    }
    return swallowKey(evt);
  } else if (keyColor === 'yellow') {
    if (evt.type === 'keydown') {
      toggleInspector();
    }
    return swallowKey(evt);
  }
  return true;
};

// Listen on window in the capture phase so we run before YouTube's own key
// handlers (this script is injected before YouTube's scripts).
window.addEventListener('keydown', eventHandler, true);
window.addEventListener('keypress', eventHandler, true);
window.addEventListener('keyup', eventHandler, true);

const COLOR_MAP = {
  red: 'rgba(255, 0, 0, 0.9)',
  green: 'rgba(0, 162, 0, 0.9)',
  yellow: 'rgba(255, 255, 0, 0.9)',
  blue: 'rgba(0, 128, 255, 0.9)',
  indigo: 'rgba(99, 102, 241, 0.9)',
  grey: 'rgba(255, 255, 255, 0.5)',
  none: 'rgba(0, 0, 0, 0)'
};

export function showNotification(text, time = 3000, color = 'grey') {
  if (!document.querySelector('.ytaf-notification-container')) {
    console.debug('Adding notification container');
    const c = document.createElement('div');
    c.classList.add('ytaf-notification-container');
    document.body.appendChild(c);
  }

  const elm = document.createElement('div');
  const elmInner = document.createElement('div');
  elmInner.textContent = text;
  elmInner.classList.add('message');
  elmInner.classList.add('message-hidden');
  elm.appendChild(elmInner);
  document.querySelector('.ytaf-notification-container').appendChild(elm);
  elmInner.style.borderColor = COLOR_MAP[color] || color;

  setTimeout(() => {
    elmInner.classList.remove('message-hidden');
  }, 100);
  setTimeout(() => {
    elmInner.classList.add('message-hidden');
    setTimeout(() => {
      elm.remove();
    }, 1000);
  }, time);
}

/**
 * Initialize ability to hide YouTube logo in top right corner.
 */
function initHideLogo() {
  const style = document.createElement('style');
  document.head.appendChild(style);

  /** @type {(hide: boolean) => void} */
  const setHidden = (hide) => {
    const visibility = hide ? 'hidden' : 'visible';
    style.textContent = `ytlr-redux-connect-ytlr-logo-entity { visibility: ${visibility}; }`;
  };

  setHidden(configRead('hideLogo'));

  configAddChangeListener('hideLogo', (evt) => {
    setHidden(evt.detail.newValue);
  });
}

function applyUIFixes() {
  try {
    const bodyClasses = document.body.classList;

    const observer = new MutationObserver(function bodyClassCallback(
      _records,
      _observer
    ) {
      try {
        if (bodyClasses.contains('app-quality-root')) {
          bodyClasses.remove('app-quality-root');
        }
      } catch (e) {
        console.error('error in <body> class observer callback:', e);
      }
    });

    observer.observe(document.body, {
      subtree: false,
      childList: false,
      attributes: true,
      attributeFilter: ['class'],
      characterData: false
    });
  } catch (e) {
    console.error('error setting up <body> class observer:', e);
  }
}

let audioOnlyEnabled = false;
let overlayObserver = null;

/**
 * The video being watched, or null on other pages. YouTube TV reuses one
 * <video> element, also for silent previews on the home screen.
 * @returns {HTMLVideoElement | null}
 */
export function getActiveVideo() {
  const video = document.querySelector('video');
  const onWatchPage = window.location.hash.startsWith('#/watch');
  return video instanceof HTMLVideoElement && video.currentSrc && onWatchPage
    ? video
    : null;
}

/** @param {HTMLVideoElement} elVideo */
async function initAudioOnlyToggle(elVideo) {
  audioOnlyEnabled = !audioOnlyEnabled;
  elVideo.style.visibility = audioOnlyEnabled ? 'hidden' : '';

  const AUDIO_OVERLAY_SELECTOR = '.ytLrAudioPlayerOverlayAudioMode';
  const YTAF_OVERLAY_CLASS = 'ytaf-ui-watchControl-overlayMessage';

  const applyAudioOverlayFilter = () => {
    const node = document.querySelector(AUDIO_OVERLAY_SELECTOR);
    if (!node) return;
    if (audioOnlyEnabled) {
      node.style.setProperty('filter', 'brightness(0)', 'important');
    } else {
      node.style.removeProperty('filter');
    }
  };
  applyAudioOverlayFilter();

  showNotification(
    `Audio-Only mode: ${audioOnlyEnabled ? 'Enabled' : 'Disabled'}`,
    2000,
    'blue'
  );

  const controlsContainer = await requireElement(
    '[idomkey="controls"]',
    HTMLElement
  );

  const updateOverlay = (root = controlsContainer) => {
    let overlay = root.querySelector(`.${YTAF_OVERLAY_CLASS}`);

    if (!audioOnlyEnabled) {
      overlay?.remove();
      return;
    }

    if (overlay) return;

    overlay = Object.assign(document.createElement('div'), {
      textContent: 'Audio-only mode. Press BLUE to show the video again.',
      className: YTAF_OVERLAY_CLASS
    });
    root.prepend(overlay);
  };
  updateOverlay();

  if (overlayObserver) overlayObserver.disconnect();
  overlayObserver = new MutationObserver(() => {
    updateOverlay();
    applyAudioOverlayFilter();
  });

  overlayObserver.observe(controlsContainer, {
    childList: true,
    subtree: true
  });
}

const runUIInit = () => {
  applyUIFixes();
  initHideLogo();
};

if (document.body) {
  runUIInit();
} else {
  document.addEventListener('DOMContentLoaded', runUIInit);
}

setTimeout(() => {
  showNotification('ClearTube TV: press GREEN for settings', 2000, 'green');
});
