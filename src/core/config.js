const CONFIG_KEY = 'ytaf-configuration';
const CONFIG_VERSION_KEY = 'ytaf-configuration-version';
const CONFIG_VERSION = 2;

/**
 * Defaults changed in config version 2. Older releases saved every default
 * they read, so a stored value equal to the old default is treated as
 * untouched and dropped to pick up the new one.
 */
const V2_PREVIOUS_DEFAULTS = {
  upgradeThumbnails: false,
  forceHighResVideo: false,
  removeEndscreen: false,
  enableSponsorBlockIntro: true,
  enableSponsorBlockOutro: true,
  enableSponsorBlockMusicOfftopic: true
};

/**
 * @typedef {'ads' | 'playback' | 'content' | 'interface'} ConfigSection
 * @typedef {{ value: unknown, label: string }} ConfigChoice
 * @typedef {{
 *   default: unknown,
 *   desc: string,
 *   section: ConfigSection,
 *   hint?: string,
 *   choices?: ConfigChoice[],
 *   requires?: string,
 *   live?: boolean
 * }} ConfigOption

 *
 * `requires` names a switch that must be on for the option to have any
 * effect. `live` options are applied immediately; the others need the app to
 * reload, which the settings menu does when it closes.
 */

/** Menu sections, in display order. */
export const configSections = /** @type {const} */ ([
  ['ads', 'Ads and sponsors'],
  ['playback', 'Playback'],
  ['content', 'Content'],
  ['interface', 'Interface']
]);

const SPEED_CHOICES = [0.75, 1, 1.1, 1.25, 1.5, 1.75, 2].map((value) => ({
  value,
  label: `${value}x`
}));

/** @type {Map<string, ConfigOption>} */
const configOptions = new Map([
  // Ads and sponsors
  [
    'enableAdBlock',
    {
      default: true,
      section: 'ads',
      desc: 'Block ads',
      hint: 'Video ads, home banners and sponsored tiles'
    }
  ],
  [
    'enableSponsorBlock',
    {
      default: true,
      section: 'ads',
      desc: 'SponsorBlock',
      hint: 'Skip segments reported by the community (sponsor.ajay.app)'
    }
  ],
  [
    'enableSponsorBlockSponsor',
    {
      requires: 'enableSponsorBlock',
      default: true,
      section: 'ads',
      desc: 'Skip sponsor segments'
    }
  ],
  [
    'enableSponsorBlockInteraction',
    {
      requires: 'enableSponsorBlock',
      default: true,
      section: 'ads',
      desc: 'Skip interaction reminders',
      hint: '"Like and subscribe" requests'
    }
  ],
  [
    'enableSponsorBlockSelfPromo',
    {
      requires: 'enableSponsorBlock',
      default: true,
      section: 'ads',
      desc: 'Skip self-promotion'
    }
  ],
  [
    'enableSponsorBlockIntro',
    {
      requires: 'enableSponsorBlock',
      default: false,
      section: 'ads',
      desc: 'Skip intros'
    }
  ],
  [
    'enableSponsorBlockOutro',
    {
      requires: 'enableSponsorBlock',
      default: false,
      section: 'ads',
      desc: 'Skip outros and credits'
    }
  ],
  [
    'enableSponsorBlockMusicOfftopic',
    {
      requires: 'enableSponsorBlock',
      default: false,
      section: 'ads',
      desc: 'Skip non-music parts of music videos'
    }
  ],
  [
    'enableSponsorBlockPreview',
    {
      requires: 'enableSponsorBlock',
      default: false,
      section: 'ads',
      desc: 'Skip recaps and previews'
    }
  ],

  // Playback
  [
    'forceHighResVideo',
    {
      default: true,
      section: 'playback',
      desc: 'Maximum video quality',
      hint: 'Select the highest resolution available'
    }
  ],
  [
    'playbackSpeed',
    {
      default: 1,
      section: 'playback',
      desc: 'Default playback speed',
      hint: 'Applied when a video starts. Use LEFT/RIGHT to change it.',
      choices: SPEED_CHOICES,
      live: true
    }
  ],
  [
    'removeEndscreen',
    {
      default: true,
      section: 'playback',
      desc: 'Remove end screens',
      hint: 'Cards that cover the last seconds of a video'
    }
  ],

  // Content
  [
    'removeShorts',
    {
      default: false,
      section: 'content',
      desc: 'Hide Shorts',
      hint: 'Home, subscriptions, search and the side menu'
    }
  ],
  [
    'upgradeThumbnails',
    {
      live: true,
      default: true,
      section: 'content',
      desc: 'High-quality thumbnails'
    }
  ],

  // Interface
  [
    'hideLogo',
    {
      live: true,
      default: false,
      section: 'interface',
      desc: 'Hide the YouTube logo'
    }
  ],
  [
    'showWatch',
    { live: true, default: false, section: 'interface', desc: 'Show clock' }
  ],
  [
    'autoAccountSelect',
    {
      default: false,
      section: 'interface',
      desc: 'Skip account selection',
      hint: 'Bypass "Who\'s watching?" on start-up'
    }
  ]
]);

const defaultConfig = (() => {
  let ret = {};
  for (const [k, v] of configOptions) {
    ret[k] = v.default;
  }
  return ret;
})();

/** @type {Record<string, DocumentFragment>} as const */
const configFrags = (() => {
  let ret = {};
  for (const k of configOptions.keys()) {
    ret[k] = new DocumentFragment();
  }
  return ret;
})();

function loadStoredConfig() {
  const storage = window.localStorage.getItem(CONFIG_KEY);

  if (storage === null) {
    console.info('Config not set; using defaults.');
    return {};
  }

  try {
    const parsed = JSON.parse(storage);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    console.warn('Stored config is not an object; using defaults.');
  } catch (err) {
    console.warn('Error parsing stored config:', err);
  }
  return {};
}

/**
 * Only values the user explicitly changed are kept here (and in storage).
 * Everything else falls back to `defaultConfig`, so changing a default in a
 * new release reaches users who never touched that option.
 * @type {Record<string, unknown>}
 */
const localConfig = migrateConfig(loadStoredConfig());

/**
 * @param {Record<string, unknown>} stored
 * @returns {Record<string, unknown>}
 */
function migrateConfig(stored) {
  const version = Number(window.localStorage.getItem(CONFIG_VERSION_KEY)) || 1;
  if (version >= CONFIG_VERSION) return stored;

  let changed = false;
  for (const [key, previous] of Object.entries(V2_PREVIOUS_DEFAULTS)) {
    if (Object.hasOwn(stored, key) && stored[key] === previous) {
      delete stored[key];
      changed = true;
    }
  }

  try {
    if (changed)
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(stored));
    window.localStorage.setItem(CONFIG_VERSION_KEY, String(CONFIG_VERSION));
  } catch (err) {
    console.warn('Could not save migrated config:', err);
  }
  return stored;
}

function configExists(key) {
  return configOptions.has(key);
}

/**
 * @param {string} key
 * @returns {ConfigOption}
 */
export function configGetOption(key) {
  const option = configOptions.get(key);
  if (!option) {
    throw new Error('tried to get unknown config key: ' + key);
  }
  return option;
}

/** @returns {string[]} All option keys, in menu order. */
export function configKeys() {
  return [...configOptions.keys()];
}

/**
 * Whether `value` is valid for `key`: one of its choices, or a value of the
 * same type as its default.
 * @param {string} key
 * @param {unknown} value
 */
export function configIsValid(key, value) {
  const option = configGetOption(key);
  if (option.choices) {
    return option.choices.some((c) => c.value === value);
  }
  return typeof value === typeof option.default;
}

export function configGetDesc(key) {
  if (!configExists(key)) {
    throw new Error('tried to get desc for unknown config key: ' + key);
  }

  return configOptions.get(key).desc;
}

export function configRead(key) {
  if (!configExists(key)) {
    throw new Error('tried to read unknown config key: ' + key);
  }

  if (Object.hasOwn(localConfig, key) && configIsValid(key, localConfig[key])) {
    return localConfig[key];
  }
  return defaultConfig[key];
}

export function configWrite(key, value) {
  if (!configExists(key)) {
    throw new Error('tried to write unknown config key: ' + key);
  }

  if (!configIsValid(key, value)) {
    throw new Error(`invalid value for config key ${key}: ${String(value)}`);
  }

  const oldValue = configRead(key);

  console.info('Changing key', key, 'from', oldValue, 'to', value);
  localConfig[key] = value;
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(localConfig));

  configFrags[key].dispatchEvent(
    new CustomEvent('ytafConfigChange', {
      detail: { key, newValue: value, oldValue }
    })
  );
}

/**
 * Add a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configAddChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.addEventListener('ytafConfigChange', callback);
}

/**
 * Remove a listener for changes in the value of a specified config option
 * @param {string} key Config option to monitor
 * @param {(evt: Event) => void} callback Function to be called on change
 */
export function configRemoveChangeListener(key, callback) {
  const frag = configFrags[key];

  frag.removeEventListener('ytafConfigChange', callback);
}
