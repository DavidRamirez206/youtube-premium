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

const configOptions = new Map([
  ['enableAdBlock', { default: true, desc: 'Enable ad blocking' }],
  ['upgradeThumbnails', { default: true, desc: 'Upgrade thumbnail quality' }],
  [
    'removeShorts',
    { default: false, desc: 'Remove Shorts from subscriptions' }
  ],
  ['enableSponsorBlock', { default: true, desc: 'Enable SponsorBlock' }],
  [
    'enableSponsorBlockSponsor',
    { default: true, desc: 'Skip sponsor segments' }
  ],
  ['enableSponsorBlockIntro', { default: false, desc: 'Skip intro segments' }],
  ['enableSponsorBlockOutro', { default: false, desc: 'Skip outro segments' }],
  [
    'enableSponsorBlockInteraction',
    {
      default: true,
      desc: 'Skip interaction reminder segments'
    }
  ],
  [
    'enableSponsorBlockSelfPromo',
    {
      default: true,
      desc: 'Skip self promotion segments'
    }
  ],
  [
    'enableSponsorBlockMusicOfftopic',
    {
      default: false,
      desc: 'Skip non-music segments in music videos'
    }
  ],
  [
    'enableSponsorBlockPreview',
    {
      default: false,
      desc: 'Skip recaps and previews'
    }
  ],
  [
    'hideLogo',
    {
      default: false,
      desc: 'Hide YouTube logo'
    }
  ],
  [
    'showWatch',
    {
      default: false,
      desc: 'Display time in UI'
    }
  ],
  [
    'forceHighResVideo',
    {
      default: true,
      desc: 'Force max resolution video playback'
    }
  ],
  [
    'removeEndscreen',
    {
      default: true,
      desc: 'Remove end screens from video'
    }
  ],
  [
    'autoAccountSelect',
    {
      default: false,
      desc: 'Bypass initial account selection on startup'
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

  return Object.hasOwn(localConfig, key)
    ? localConfig[key]
    : defaultConfig[key];
}

export function configWrite(key, value) {
  if (!configExists(key)) {
    throw new Error('tried to write unknown config key: ' + key);
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
