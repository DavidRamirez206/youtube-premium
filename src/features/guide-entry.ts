// "CT Options" entry in YouTube's side menu, right above YouTube's own
// Settings, that opens the ClearTube TV settings menu. The entry is added
// to the side menu (guide) API response.
//
// YouTube TV runs a side menu entry's command as soon as the entry gets
// focus, so the command is only intercepted (and ignored) and the menu is
// opened when OK is pressed on the focused entry.

import { ResolveCommandRegistry } from '../app_api';
import { t } from '../core/i18n';
import { reportError } from '../core/safe';
import { addJsonTransformer, type JsonObject } from '../hooks/json-parse';

export const OPTIONS_COMMAND = 'clearTubeOptionsEndpoint';

declare global {
  interface Window {
    ytaf_showOptionsPanel?: (visible?: boolean) => void;
  }
}

export function optionsEntry() {
  return {
    guideEntryRenderer: {
      navigationEndpoint: { [OPTIONS_COMMAND]: {} },
      icon: { iconType: 'MENU_FILTER' },
      formattedTitle: { simpleText: t('guide.options') },
      trackingParams: ''
    }
  };
}

const isSettingsEntry = (item: JsonObject | undefined) =>
  !!item?.guideEntryRenderer?.navigationEndpoint?.applicationSettingsEndpoint;

const isOptionsEntry = (item: JsonObject | undefined) =>
  !!item?.guideEntryRenderer?.navigationEndpoint?.[OPTIONS_COMMAND];

/** Lists of side menu entries in a guide response. */
function guideSections(data: JsonObject): JsonObject[][] {
  const sections: JsonObject[][] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as JsonObject;
    const items = node.guideSectionRenderer?.items;
    if (Array.isArray(items)) sections.push(items);
    for (const key in node) visit(node[key]);
  };
  visit(data);
  return sections;
}

/**
 * Adds the "CT Options" entry above YouTube's Settings entry (or at the
 * end of the last section). Returns whether it was added.
 */
export function addOptionsEntry(data: JsonObject): boolean {
  const sections = guideSections(data);
  if (!sections.length) return false;
  if (sections.some((items) => items.some(isOptionsEntry))) return false;

  for (const items of sections) {
    const index = items.findIndex(isSettingsEntry);
    if (index >= 0) {
      items.splice(index, 0, optionsEntry());
      return true;
    }
  }
  sections[sections.length - 1]!.push(optionsEntry());
  return true;
}

addJsonTransformer('guide-entry', (data) => {
  addOptionsEntry(data);
});

export function openOptions() {
  try {
    window.ytaf_showOptionsPanel?.(true);
  } catch (error) {
    reportError('CT Options', error);
  }
}

const OK_KEYS = [13, 32];

/** Whether the focused element is the "CT Options" entry. */
export function optionsEntryFocused(doc: Document = document): boolean {
  const focused = doc.activeElement;
  return !!focused && focused.textContent?.trim() === t('guide.options');
}

/** Opens the menu with OK on the entry; the press never reaches YouTube. */
export function installOptionsKey(target: Window = window) {
  let consumed = false;
  const onKey = (evt: KeyboardEvent) => {
    try {
      if (!OK_KEYS.includes(evt.keyCode)) return;
      if (evt.type === 'keydown') {
        consumed = optionsEntryFocused(target.document);
        if (!consumed) return;
        openOptions();
      } else if (!consumed) {
        return;
      } else if (evt.type === 'keyup') {
        consumed = false;
      }
      evt.preventDefault();
      evt.stopImmediatePropagation();
    } catch (error) {
      reportError('CT Options key', error);
    }
  };
  for (const type of ['keydown', 'keypress', 'keyup'] as const) {
    target.addEventListener(type, onKey, true);
  }
}

installOptionsKey();

ResolveCommandRegistry.getInstance()
  .then((registry) => {
    // Runs when the entry gets focus: do nothing.
    registry.setHook(OPTIONS_COMMAND, () => undefined);
  })
  .catch((error: unknown) => reportError('CT Options', error));
