/*global __YTAF_VERSION__*/
// ClearTube TV settings menu: a list of options grouped by section, driven
// entirely by the remote (see ui.js for the key bindings).

import {
  configAddChangeListener,
  configGetOption,
  configKeys,
  configRead,
  configSections,
  configWrite
} from '../core/config.js';
import { computeListOffset } from './menu-scroll.js';

const LOGO_MARK =
  '<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="ctv-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs><rect width="512" height="512" rx="116" fill="url(#ctv-g)"/><path d="M370.9 159.6A150 150 0 1 0 370.9 352.4" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round"/><path d="M226 200v112l92-56z" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/></svg>';

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
function formatValue(key) {
  const option = configGetOption(key);
  const value = configRead(key);
  if (option.choices) {
    const choice = option.choices.find((c) => c.value === value);
    return choice ? choice.label : String(value);
  }
  return value ? 'ON' : 'OFF';
}

/** @param {string} key */
function isAvailable(key) {
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
    el('div', 'ctv-menu-version', `Version ${__YTAF_VERSION__}`)
  );
  const pending = el(
    'div',
    'ctv-menu-pending',
    'Changes will be applied when the menu closes'
  );
  header.append(logo, titles, pending);

  // Body
  const body = el('div', 'ctv-menu-body');
  const list = el('div', 'ctv-menu-list');
  body.appendChild(list);

  /** @type {HTMLElement[]} */
  const rows = [];

  for (const [sectionId, sectionTitle] of configSections) {
    const keys = configKeys().filter(
      (key) => configGetOption(key).section === sectionId
    );
    if (!keys.length) continue;

    const heading = el('div', 'ctv-menu-section', sectionTitle);
    list.appendChild(heading);

    keys.forEach((key, index) => {
      const option = configGetOption(key);
      const row = el('div', 'ctv-menu-row');
      row.dataset.key = key;
      if (index === 0) row.dataset.sectionStart = 'true';
      if (option.requires) row.classList.add('ctv-child');

      const text = el('div', 'ctv-menu-row-text');
      text.appendChild(el('div', 'ctv-menu-row-label', option.desc));
      if (option.hint) {
        text.appendChild(el('div', 'ctv-menu-row-hint', option.hint));
      }

      const value = el(
        'div',
        option.choices ? 'ctv-menu-choice' : 'ctv-menu-switch'
      );
      value.dataset.role = 'value';

      row.append(text, value);
      list.appendChild(row);
      rows.push(row);
    });
  }

  // Footer
  const footer = el('div', 'ctv-menu-footer');
  for (const [keyName, action] of [
    ['UP / DOWN', 'Select'],
    ['OK', 'Change'],
    ['LEFT / RIGHT', 'Adjust'],
    ['GREEN / BACK', 'Close']
  ]) {
    const item = el('span', 'ctv-menu-legend');
    item.append(el('span', 'ctv-menu-key', keyName), action);
    footer.appendChild(item);
  }

  panel.append(header, body, footer);

  let selected = 0;
  let offset = 0;
  let visible = false;
  let needsReload = false;

  function render() {
    rows.forEach((row, index) => {
      const key = /** @type {string} */ (row.dataset.key);
      const value = /** @type {HTMLElement} */ (
        row.querySelector('[data-role="value"]')
      );
      value.textContent = formatValue(key);
      value.classList.toggle('ctv-on', configRead(key) === true);
      row.classList.toggle('ctv-selected', index === selected);
      row.classList.toggle('ctv-disabled', !isAvailable(key));
    });
    panel.classList.toggle('ctv-pending', needsReload);
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
    const top = heading.offsetTop;
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
    render();
  }

  /**
   * @param {number} direction
   * @param {boolean} wrap
   */
  function change(direction, wrap) {
    const key = rows[selected]?.dataset.key;
    if (!key || !isAvailable(key)) return;
    const value = nextValue(key, direction, wrap);
    if (value === configRead(key)) return;
    configWrite(key, value);
    if (!configGetOption(key).live) needsReload = true;
    render();
  }

  for (const key of configKeys()) {
    configAddChangeListener(key, () => visible && render());
  }

  return {
    element: overlay,
    isOpen: () => visible,
    open() {
      if (visible) return;
      visible = true;
      selected = 0;
      offset = 0;
      needsReload = false;
      overlay.style.display = 'block';
      render();
    },
    /** @returns {boolean} whether the app must reload to apply changes */
    close() {
      if (!visible) return false;
      visible = false;
      overlay.style.display = 'none';
      return needsReload;
    },
    up: () => move(-1),
    down: () => move(1),
    activate: () => change(1, true),
    left: () => change(-1, false),
    right: () => change(1, false),
    get selectedKey() {
      return rows[selected]?.dataset.key;
    }
  };
}
