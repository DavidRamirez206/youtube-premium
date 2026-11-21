/*global __YTAF_VERSION__*/
// ClearTube TV settings menu. Changes are staged in a draft and applied
// together with "Apply changes"; nothing reloads the app. Leaving with
// unsaved changes asks whether to apply, discard or keep editing.
// Design rules: workspace skill "menu-ui".

import {
  configGetOption,
  configKeys,
  configRead,
  configSections,
  configWrite
} from '../core/config.js';
import { onLanguageChange, t } from '../core/i18n';
import { reportError } from '../core/safe';
import { computeListOffset } from './menu-scroll.js';

const LOGO_MARK =
  '<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="ctv-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs><rect width="512" height="512" rx="116" fill="url(#ctv-g)"/><path d="M370.9 159.6A150 150 0 1 0 370.9 352.4" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round"/><path d="M226 200v112l92-56z" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/></svg>';

/** Size the menu is designed for; smaller screens scale it down. */
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

export const APPLY_ACTION = 'action:apply';
export const RESET_ACTION = 'action:restoreDefaults';
const DIALOG_CHOICES = ['apply', 'discard', 'keep'];

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

const isAction = (/** @type {string} */ key) => key.startsWith('action:');

/** @param {string} key */
function optionLabel(key) {
  return t(`option.${key}.desc`, {}, configGetOption(key).desc);
}

/** @param {string} key */
function optionHint(key) {
  const hint = configGetOption(key).hint;
  return hint ? t(`option.${key}.hint`, {}, hint) : '';
}

/** @param {string} key @param {{ value: unknown, label: string }} choice */
function choiceLabel(key, choice) {
  return t(`choice.${key}.${String(choice.value)}`, {}, choice.label);
}

/**
 * Next value of an option. Switches toggle; choice options move through
 * their list (`direction` -1 or +1) and wrap around when activated with OK.
 * @param {string} key
 * @param {number} direction
 * @param {boolean} wrap
 * @param {unknown} [current] value to start from (defaults to the saved one)
 */
export function nextValue(key, direction, wrap, current = configRead(key)) {
  const option = configGetOption(key);
  if (!option.choices) return !current;

  const count = option.choices.length;
  const index = option.choices.findIndex((c) => c.value === current);
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

/**
 * @param {{ notify?: (text: string) => void }} [options]
 */
export function createSettingsMenu({ notify = () => {} } = {}) {
  /** Staged values, applied with "Apply changes". */
  const draft = new Map();

  /** @param {string} key */
  const valueOf = (key) => (draft.has(key) ? draft.get(key) : configRead(key));

  /** @param {string} key */
  function isAvailable(key) {
    if (isAction(key)) return true;
    const { requires } = configGetOption(key);
    return !requires || Boolean(valueOf(requires));
  }

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
  const title = el('div', 'ctv-menu-title');
  const subtitle = el('div', 'ctv-menu-version');
  titles.append(title, subtitle);
  const pending = el('div', 'ctv-menu-pending');
  header.append(logo, titles, pending);

  // Body
  const body = el('div', 'ctv-menu-body');
  const list = el('div', 'ctv-menu-list');
  body.appendChild(list);

  /** @type {HTMLElement[]} */
  const rows = [];
  /** @type {[HTMLElement, string][]} */
  const headings = [];

  /** @param {string} sectionId */
  function addHeading(sectionId) {
    const heading = el('div', 'ctv-menu-section');
    headings.push([heading, sectionId]);
    list.appendChild(heading);
  }

  /** @param {string} key @param {boolean} first */
  function addRow(key, first) {
    const row = el('div', 'ctv-menu-row');
    row.dataset.key = key;
    if (first) row.dataset.sectionStart = 'true';
    const text = el('div', 'ctv-menu-row-text');
    const label = el('div', 'ctv-menu-row-label');
    label.dataset.role = 'label';
    const hint = el('div', 'ctv-menu-row-hint');
    hint.dataset.role = 'hint';
    text.append(label, hint);
    row.appendChild(text);
    list.appendChild(row);
    rows.push(row);
    return row;
  }

  for (const [sectionId] of configSections) {
    const keys = configKeys().filter(
      (key) => configGetOption(key).section === sectionId
    );
    if (!keys.length) continue;
    addHeading(sectionId);

    keys.forEach((key, index) => {
      try {
        const option = configGetOption(key);
        const row = addRow(key, index === 0);
        if (option.requires) row.classList.add('ctv-child');

        const value = el('div', 'ctv-menu-value');
        if (option.choices) {
          const picker = el('div', 'ctv-menu-choice');
          const current = el('span', 'ctv-menu-choice-value');
          current.dataset.role = 'value';
          picker.append(
            el('span', 'ctv-arrow ctv-arrow-left'),
            current,
            el('span', 'ctv-arrow ctv-arrow-right')
          );
          value.appendChild(picker);
        } else {
          const toggle = el('div', 'ctv-menu-switch');
          toggle.dataset.role = 'value';
          value.appendChild(toggle);
        }
        row.appendChild(value);
      } catch (error) {
        reportError(`settings row ${key}`, error);
      }
    });
  }

  // Actions and About
  addHeading('actions');
  addRow(APPLY_ACTION, true).classList.add('ctv-action', 'ctv-apply');
  addRow(RESET_ACTION, false).classList.add('ctv-action');
  addHeading('about');
  const about = el('div', 'ctv-menu-about');
  const aboutLines = ['about.data', 'about.license', 'about.link'].map(
    (key) => {
      const line = el('div', '');
      about.appendChild(line);
      return /** @type {[HTMLElement, string]} */ ([line, key]);
    }
  );
  list.appendChild(about);

  // Footer
  const footer = el('div', 'ctv-menu-footer');
  const legend = el('div', 'ctv-menu-legend-list');
  /** @type {[HTMLElement, string][]} */
  const legendItems = [];
  for (const [keyName, textKey] of [
    ['key.updown', 'legend.select'],
    ['key.ok', 'legend.change'],
    ['key.leftright', 'legend.adjust'],
    ['key.close', 'legend.close']
  ]) {
    const item = el('span', 'ctv-menu-legend');
    const keyEl = el('span', 'ctv-menu-key');
    const action = el('span', '');
    item.append(keyEl, action);
    legend.appendChild(item);
    legendItems.push([keyEl, keyName], [action, textKey]);
  }
  const position = el('div', 'ctv-menu-position');
  footer.append(legend, position);

  // Unsaved changes bar
  const dialog = el('div', 'ctv-menu-dialog');
  const dialogTitle = el('div', 'ctv-menu-dialog-title');
  const dialogButtons = DIALOG_CHOICES.map((choice) => {
    const button = el('div', `ctv-menu-button ctv-button-${choice}`);
    button.dataset.choice = choice;
    return button;
  });
  const dialogRow = el('div', 'ctv-menu-dialog-buttons');
  dialogRow.append(...dialogButtons);
  dialog.append(dialogTitle, dialogRow);

  panel.append(header, body, footer, dialog);

  let selected = 0;
  let offset = 0;
  let visible = false;
  let dialogOpen = false;
  let dialogChoice = 0;
  /** @type {() => void} */
  let onClosed = () => {};

  function renderTexts() {
    title.textContent = t('menu.title');
    subtitle.textContent = t('menu.subtitle', { version: __YTAF_VERSION__ });
    for (const [heading, id] of headings) {
      heading.textContent = t(`section.${id}`);
    }
    for (const [line, key] of aboutLines) line.textContent = t(key);
    for (const [action, key] of legendItems) action.textContent = t(key);
    dialogTitle.textContent = t('unsaved.title');
    dialogButtons.forEach((button) => {
      button.textContent = t(`unsaved.${button.dataset.choice}`);
    });
  }

  /** @param {HTMLElement} row @param {number} index */
  function renderRow(row, index) {
    const key = /** @type {string} */ (row.dataset.key);
    const available = isAvailable(key);
    row.classList.toggle('ctv-selected', index === selected && !dialogOpen);
    row.classList.toggle('ctv-disabled', !available);

    const label = /** @type {HTMLElement} */ (
      row.querySelector('[data-role="label"]')
    );
    const hint = /** @type {HTMLElement} */ (
      row.querySelector('[data-role="hint"]')
    );

    if (key === APPLY_ACTION) {
      label.textContent = t('action.apply');
      hint.textContent = draft.size
        ? t('action.applyHint')
        : t('action.applyNone');
      row.classList.toggle('ctv-ready', draft.size > 0);
      return;
    }
    if (key === RESET_ACTION) {
      label.textContent = t('action.reset');
      hint.textContent = t('action.resetHint');
      return;
    }

    const option = configGetOption(key);
    const value = valueOf(key);
    label.textContent = optionLabel(key);
    hint.textContent = available
      ? optionHint(key)
      : t('menu.requires', { parent: optionLabel(option.requires) });
    row.classList.toggle('ctv-modified', draft.has(key));

    const valueEl = /** @type {HTMLElement} */ (
      row.querySelector('[data-role="value"]')
    );
    if (option.choices) {
      const choices = option.choices;
      const choiceIndex = choices.findIndex((c) => c.value === value);
      const choice = choices[choiceIndex];
      valueEl.textContent = choice ? choiceLabel(key, choice) : String(value);
      const picker = /** @type {HTMLElement} */ (valueEl.parentElement);
      picker.classList.toggle('ctv-at-start', choiceIndex <= 0);
      picker.classList.toggle('ctv-at-end', choiceIndex >= choices.length - 1);
    } else {
      // A dependent option has no effect while its parent is off, so it is
      // shown as off.
      const on = available && value === true;
      valueEl.textContent = on ? t('menu.on') : t('menu.off');
      valueEl.classList.toggle('ctv-on', on);
    }
  }

  function render() {
    renderTexts();
    rows.forEach((row, index) => {
      try {
        renderRow(row, index);
      } catch (error) {
        reportError(`settings row ${row.dataset.key}`, error);
      }
    });
    pending.textContent =
      draft.size === 1
        ? t('menu.unsavedOne')
        : t('menu.unsaved', { count: draft.size });
    panel.classList.toggle('ctv-pending', draft.size > 0);
    panel.classList.toggle('ctv-dialog-open', dialogOpen);
    dialogButtons.forEach((button, index) => {
      button.classList.toggle(
        'ctv-selected',
        dialogOpen && index === dialogChoice
      );
    });
    position.textContent = t('menu.position', {
      current: selected + 1,
      total: rows.length
    });
    scrollToSelected();
  }

  function scrollToSelected() {
    const row = rows[selected];
    if (!row) return;
    // Show the section heading together with the first row of a section,
    // and the About text with the last row.
    const heading =
      row.dataset.sectionStart && row.previousElementSibling
        ? /** @type {HTMLElement} */ (row.previousElementSibling)
        : row;
    const isLast = selected === rows.length - 1;
    const top = heading.offsetTop;
    const bottom = isLast
      ? about.offsetTop + about.offsetHeight
      : row.offsetTop + row.offsetHeight;
    offset = computeListOffset({
      offset,
      rowTop: top,
      rowHeight: bottom - top,
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

  /** @param {string} key @param {unknown} value */
  function stage(key, value) {
    if (value === configRead(key)) draft.delete(key);
    else draft.set(key, value);
  }

  function apply() {
    if (!draft.size) return false;
    const changes = [...draft];
    draft.clear();
    for (const [key, value] of changes) {
      try {
        configWrite(key, value);
      } catch (error) {
        reportError(`applying ${key}`, error);
      }
    }
    notify(t('notify.applied'));
    return true;
  }

  function restoreDefaults() {
    for (const key of configKeys()) {
      stage(key, configGetOption(key).default);
    }
  }

  /**
   * @param {number} direction
   * @param {boolean} wrap
   */
  function change(direction, wrap) {
    const key = rows[selected]?.dataset.key;
    if (!key || !isAvailable(key)) return;
    if (isAction(key)) {
      if (!wrap) return;
      if (key === APPLY_ACTION) apply();
      else restoreDefaults();
      render();
      return;
    }
    stage(key, nextValue(key, direction, wrap, valueOf(key)));
    render();
  }

  function hide() {
    visible = false;
    dialogOpen = false;
    overlay.style.display = 'none';
    onClosed();
  }

  /** Closes, or asks first when there are unsaved changes. */
  function requestClose() {
    if (!visible) return;
    if (!draft.size) {
      hide();
      return;
    }
    dialogOpen = true;
    dialogChoice = 0;
    render();
  }

  function confirmDialog() {
    const choice = DIALOG_CHOICES[dialogChoice];
    dialogOpen = false;
    if (choice === 'apply') {
      apply();
      hide();
    } else if (choice === 'discard') {
      draft.clear();
      notify(t('notify.discarded'));
      hide();
    } else {
      render();
    }
  }

  function applyScale() {
    const scale = menuScale(window.innerWidth, window.innerHeight);
    panel.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  onLanguageChange(() => visible && render());

  /**
   * Handles a remote key while the menu is open.
   * @param {'up' | 'down' | 'left' | 'right' | 'ok' | 'back'} key
   */
  function handleKey(key) {
    if (!visible) return;
    if (dialogOpen) {
      if (key === 'left') dialogChoice = Math.max(0, dialogChoice - 1);
      else if (key === 'right') {
        dialogChoice = Math.min(DIALOG_CHOICES.length - 1, dialogChoice + 1);
      } else if (key === 'ok') return confirmDialog();
      else if (key === 'back') dialogOpen = false;
      render();
      return;
    }
    if (key === 'up') move(-1);
    else if (key === 'down') move(1);
    else if (key === 'ok') change(1, true);
    else if (key === 'left') change(-1, false);
    else if (key === 'right') change(1, false);
    else if (key === 'back') requestClose();
  }

  return {
    element: overlay,
    isOpen: () => visible,
    /** @param {() => void} [whenClosed] */
    open(whenClosed) {
      try {
        if (visible) return;
        visible = true;
        selected = 0;
        offset = 0;
        dialogOpen = false;
        draft.clear();
        onClosed = whenClosed ?? (() => {});
        overlay.style.display = 'block';
        applyScale();
        render();
      } catch (error) {
        reportError('settings menu open', error);
      }
    },
    /** @param {Parameters<typeof handleKey>[0]} key */
    handleKey(key) {
      try {
        handleKey(key);
      } catch (error) {
        reportError(`settings menu ${key}`, error);
      }
    },
    requestClose,
    get selectedKey() {
      return rows[selected]?.dataset.key;
    },
    get unsavedChanges() {
      return draft.size;
    },
    get dialogOpen() {
      return dialogOpen;
    }
  };
}
