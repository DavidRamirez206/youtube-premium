/*global __YTAF_VERSION__*/
// ClearTube TV settings menu: options grouped by section plus an About
// section, driven entirely by the remote (see ui.js for the key bindings).
// Design rules: workspace skill "menu-ui".

import {
  configAddChangeListener,
  configGetOption,
  configKeys,
  configRead,
  configReset,
  configSections,
  configWrite
} from '../core/config.js';
import { reportError } from '../core/safe';
import { computeListOffset } from './menu-scroll.js';

const LOGO_MARK =
  '<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="ctv-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs><rect width="512" height="512" rx="116" fill="url(#ctv-g)"/><path d="M370.9 159.6A150 150 0 1 0 370.9 352.4" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round"/><path d="M226 200v112l92-56z" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/></svg>';

/** Size the menu is designed for; smaller screens scale it down. */
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const RESET_ACTION = 'action:restoreDefaults';

const ABOUT_TEXT = [
  'Uses SponsorBlock and DeArrow data from sponsor.ajay.app, licensed under CC BY-NC-SA 4.0.',
  'Free software under the GPL-3.0. Not affiliated with YouTube or Google.',
  'github.com/DavidRamirez206/ClearTube-TV'
];

/**
 * @param {string} tag
 * @param {string} className
 * @param {string} [text]
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** @param {string} key */
function isAvailable(key) {
  if (key === RESET_ACTION) return true;
  const { requires } = configGetOption(key);
  return !requires || Boolean(configRead(requires));
}

/**
 * Next value of an option. Switches toggle; choice options move through
 * their list (`direction` -1 or +1) and wrap around when activated with OK.
 * @param {string} key
 * @param {number} direction
 * @param {boolean} wrap
 */
export function nextValue(key, direction, wrap) {
  const option = configGetOption(key);
  const value = configRead(key);
  if (!option.choices) return !value;

  const count = option.choices.length;
  const index = option.choices.findIndex((c) => c.value === value);
  let next = (index < 0 ? 0 : index) + direction;
  if (wrap) next = (next + count) % count;
  next = Math.max(0, Math.min(count - 1, next));
  return option.choices[next]?.value;
}

/** Scale that fits the 1080p design into the current viewport. */
export function menuScale(width, height) {
  if (!width || !height) return 1;
  return Math.min(1, width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
}

export function createSettingsMenu() {
  const overlay = el('div', 'ctv-menu-overlay');
  overlay.id = 'ytaf-options-overlay';
  overlay.style.display = 'none';

  const panel = el('div', 'ctv-menu');
  panel.id = 'ytaf-options-panel';
  overlay.appendChild(panel);

  // Header
  const header = el('div', 'ctv-menu-header');
  const logo = el('div', 'ctv-menu-logo');
  logo.innerHTML = LOGO_MARK; // static, local markup
  const titles = el('div', 'ctv-menu-titles');
  titles.appendChild(el('div', 'ctv-menu-title', 'ClearTube TV'));
  titles.appendChild(
    el('div', 'ctv-menu-version', `Settings  -  version ${__YTAF_VERSION__}`)
  );
  const pending = el(
    'div',
    'ctv-menu-pending',
    'Changes apply when you close the menu'
  );
  header.append(logo, titles, pending);

  // Body
  const body = el('div', 'ctv-menu-body');
  const list = el('div', 'ctv-menu-list');
  body.appendChild(list);

  /** @type {HTMLElement[]} */
  const rows = [];

  /**
   * @param {string} key
   * @param {string} label
   * @param {string | undefined} hint
   * @param {boolean} first
   */
  function addRow(key, label, hint, first) {
    const row = el('div', 'ctv-menu-row');
    row.dataset.key = key;
    if (first) row.dataset.sectionStart = 'true';

    const text = el('div', 'ctv-menu-row-text');
    const labelEl = el('div', 'ctv-menu-row-label', label);
    labelEl.dataset.role = 'label';
    text.appendChild(labelEl);
    if (hint) text.appendChild(el('div', 'ctv-menu-row-hint', hint));
    row.appendChild(text);

    list.appendChild(row);
    rows.push(row);
    return row;
  }

  for (const [sectionId, sectionTitle] of configSections) {
    const keys = configKeys().filter(
      (key) => configGetOption(key).section === sectionId
    );
    if (!keys.length) continue;
    list.appendChild(el('div', 'ctv-menu-section', sectionTitle));

    keys.forEach((key, index) => {
      try {
        const option = configGetOption(key);
        const row = addRow(key, option.desc, option.hint, index === 0);
        if (option.requires) row.classList.add('ctv-child');

        if (option.choices) {
          const picker = el('div', 'ctv-menu-choice');
          const value = el('span', 'ctv-menu-choice-value');
          value.dataset.role = 'value';
          picker.append(
            el('span', 'ctv-arrow ctv-arrow-left'),
            value,
            el('span', 'ctv-arrow ctv-arrow-right')
          );
          row.appendChild(picker);
        } else {
          const value = el('div', 'ctv-menu-switch');
          value.dataset.role = 'value';
          row.appendChild(value);
        }
      } catch (error) {
        reportError(`settings row ${key}`, error);
      }
    });
  }

  // About
  list.appendChild(el('div', 'ctv-menu-section', 'About'));
  const about = el('div', 'ctv-menu-about');
  for (const line of ABOUT_TEXT) about.appendChild(el('div', '', line));
  list.appendChild(about);
  addRow(
    RESET_ACTION,
    'Restore defaults',
    'Return every option to its original value',
    false
  ).classList.add('ctv-action');

  // Footer
  const footer = el('div', 'ctv-menu-footer');
  const legend = el('div', 'ctv-menu-legend-list');
  for (const [keyName, action] of [
    ['UP / DOWN', 'Select'],
    ['OK', 'Change'],
    ['LEFT / RIGHT', 'Adjust'],
    ['GREEN / BACK', 'Close']
  ]) {
    const item = el('span', 'ctv-menu-legend');
    item.append(el('span', 'ctv-menu-key', keyName), action);
    legend.appendChild(item);
  }
  const position = el('div', 'ctv-menu-position');
  footer.append(legend, position);

  panel.append(header, body, footer);

  let selected = 0;
  let offset = 0;
  let visible = false;
  let needsReload = false;
  let confirmReset = false;

  /** @param {HTMLElement} row @param {number} index */
  function renderRow(row, index) {
    const key = /** @type {string} */ (row.dataset.key);
    row.classList.toggle('ctv-selected', index === selected);
    row.classList.toggle('ctv-disabled', !isAvailable(key));

    if (key === RESET_ACTION) {
      const label = /** @type {HTMLElement} */ (
        row.querySelector('[data-role="label"]')
      );
      label.textContent = confirmReset
        ? 'Press OK again to restore defaults'
        : 'Restore defaults';
      row.classList.toggle('ctv-confirm', confirmReset);
      return;
    }

    const option = configGetOption(key);
    const value = configRead(key);
    const valueEl = /** @type {HTMLElement} */ (
      row.querySelector('[data-role="value"]')
    );
    if (option.choices) {
      const choices = option.choices;
      const choiceIndex = choices.findIndex((c) => c.value === value);
      valueEl.textContent = choices[choiceIndex]?.label ?? String(value);
      const picker = /** @type {HTMLElement} */ (valueEl.parentElement);
      picker.classList.toggle('ctv-at-start', choiceIndex <= 0);
      picker.classList.toggle('ctv-at-end', choiceIndex >= choices.length - 1);
    } else {
      valueEl.textContent = value ? 'ON' : 'OFF';
      valueEl.classList.toggle('ctv-on', value === true);
    }
  }

  function render() {
    rows.forEach((row, index) => {
      try {
        renderRow(row, index);
      } catch (error) {
        reportError(`settings row ${row.dataset.key}`, error);
      }
    });
    panel.classList.toggle('ctv-pending', needsReload);
    position.textContent = `${selected + 1} of ${rows.length}`;
    scrollToSelected();
  }

  function scrollToSelected() {
    const row = rows[selected];
    if (!row) return;
    // Show the section heading together with the first row of a section.
    const heading =
      row.dataset.sectionStart && row.previousElementSibling
        ? /** @type {HTMLElement} */ (row.previousElementSibling)
        : row;
    // The last row also brings the About text into view.
    const top =
      selected === rows.length - 1 ? about.offsetTop : heading.offsetTop;
    offset = computeListOffset({
      offset,
      rowTop: top,
      rowHeight: row.offsetTop + row.offsetHeight - top,
      listTop: 0,
      viewportHeight: body.clientHeight,
      margin: 8
    });
    list.style.transform = `translateY(-${offset}px)`;
  }

  /** @param {number} delta */
  function move(delta) {
    let index = selected;
    do {
      index += delta;
    } while (
      rows[index] &&
      !isAvailable(/** @type {string} */ (rows[index].dataset.key))
    );
    if (rows[index]) selected = index;
    confirmReset = false;
    render();
  }

  function restoreDefaults() {
    if (!confirmReset) {
      confirmReset = true;
      render();
      return;
    }
    confirmReset = false;
    const changed = configReset();
    if (changed.some((key) => !configGetOption(key).live)) {
      needsReload = true;
    }
    render();
  }

  /**
   * @param {number} direction
   * @param {boolean} wrap
   */
  function change(direction, wrap) {
    const key = rows[selected]?.dataset.key;
    if (!key || !isAvailable(key)) return;
    if (key === RESET_ACTION) {
      if (wrap) restoreDefaults();
      return;
    }
    const value = nextValue(key, direction, wrap);
    if (value === configRead(key)) return;
    configWrite(key, value);
    if (!configGetOption(key).live) needsReload = true;
    render();
  }

  function applyScale() {
    const scale = menuScale(window.innerWidth, window.innerHeight);
    panel.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  for (const key of configKeys()) {
    configAddChangeListener(key, () => visible && render());
  }

  /** Runs a menu action; an error is reported and never reaches YouTube. */
  const safely =
    (/** @type {string} */ name, /** @type {() => void} */ fn) => () => {
      try {
        fn();
      } catch (error) {
        reportError(`settings menu ${name}`, error);
      }
    };

  return {
    element: overlay,
    isOpen: () => visible,
    open: safely('open', () => {
      if (visible) return;
      visible = true;
      selected = 0;
      offset = 0;
      needsReload = false;
      confirmReset = false;
      overlay.style.display = 'block';
      applyScale();
      render();
    }),
    /** @returns {boolean} whether the app must reload to apply changes */
    close() {
      if (!visible) return false;
      visible = false;
      confirmReset = false;
      overlay.style.display = 'none';
      return needsReload;
    },
    up: safely('up', () => move(-1)),
    down: safely('down', () => move(1)),
    activate: safely('change', () => change(1, true)),
    left: safely('change', () => change(-1, false)),
    right: safely('change', () => change(1, false)),
    get selectedKey() {
      return rows[selected]?.dataset.key;
    }
  };
}
