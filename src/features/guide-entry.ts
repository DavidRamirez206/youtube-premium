// "CT Options" entry in YouTube's side menu, right above YouTube's own
// Settings, that opens the ClearTube TV settings menu. The entry is added
// to the side menu (guide) API response; selecting it sends a custom
// command that is intercepted before YouTube tries to resolve it.

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
      icon: { iconType: 'TUNE' },
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

ResolveCommandRegistry.getInstance()
  .then((registry) => {
    registry.setHook(OPTIONS_COMMAND, () => {
      openOptions();
      return undefined;
    });
  })
  .catch((error: unknown) => reportError('CT Options', error));
