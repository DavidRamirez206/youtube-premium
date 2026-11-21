import { beforeEach, describe, expect, it, vi } from 'vitest';

const CONFIG_KEY = 'ytaf-configuration';

async function loadConfig() {
  vi.resetModules();
  return import('../src/core/config.js');
}

describe('config', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns defaults when nothing is stored', async () => {
    const { configRead } = await loadConfig();
    expect(configRead('enableAdBlock')).toBe(true);
    expect(configRead('removeShorts')).toBe(false);
  });

  it('throws on unknown keys', async () => {
    const { configRead, configWrite, configGetDesc } = await loadConfig();
    expect(() => configRead('nope')).toThrow(/unknown config key/);
    expect(() => configWrite('nope', true)).toThrow(/unknown config key/);
    expect(() => configGetDesc('nope')).toThrow(/unknown config key/);
  });

  it('persists writes to localStorage', async () => {
    const { configWrite } = await loadConfig();
    configWrite('enableAdBlock', false);
    const stored = JSON.parse(window.localStorage.getItem(CONFIG_KEY)!);
    expect(stored.enableAdBlock).toBe(false);

    const { configRead } = await loadConfig();
    expect(configRead('enableAdBlock')).toBe(false);
  });

  it('falls back to defaults when stored JSON is corrupt', async () => {
    window.localStorage.setItem(CONFIG_KEY, '{not json');
    const { configRead } = await loadConfig();
    expect(configRead('enableAdBlock')).toBe(true);
  });

  it('notifies change listeners with old and new values', async () => {
    const { configAddChangeListener, configRemoveChangeListener, configWrite } =
      await loadConfig();
    const listener = vi.fn();
    configAddChangeListener('hideLogo', listener);
    configWrite('hideLogo', true);
    expect(listener).toHaveBeenCalledOnce();
    const evt = listener.mock.calls[0]![0] as CustomEvent;
    expect(evt.detail).toEqual({
      key: 'hideLogo',
      newValue: true,
      oldValue: false
    });

    configRemoveChangeListener('hideLogo', listener);
    configWrite('hideLogo', false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not persist defaults that were only read', async () => {
    const { configRead, configWrite } = await loadConfig();
    configRead('removeEndscreen');
    configRead('forceHighResVideo');
    configWrite('enableAdBlock', false);
    const stored = JSON.parse(window.localStorage.getItem(CONFIG_KEY)!);
    expect(stored).toEqual({ enableAdBlock: false });
  });

  it('ignores stored values that are not an object', async () => {
    window.localStorage.setItem(CONFIG_KEY, '[1,2]');
    const { configRead } = await loadConfig();
    expect(configRead('enableAdBlock')).toBe(true);
  });

  describe('defaults', () => {
    it.each([
      ['enableAdBlock', true],
      ['enableSponsorBlock', true],
      ['enableSponsorBlockSponsor', true],
      ['enableSponsorBlockInteraction', true],
      ['enableSponsorBlockSelfPromo', true],
      ['upgradeThumbnails', true],
      ['forceHighResVideo', true],
      ['removeEndscreen', true],
      ['enableSponsorBlockIntro', false],
      ['enableSponsorBlockOutro', false],
      ['enableSponsorBlockMusicOfftopic', false],
      ['enableSponsorBlockPreview', false],
      ['removeShorts', false],
      ['hideLogo', false],
      ['showWatch', false],
      ['autoAccountSelect', false]
    ])('%s defaults to %s', async (key, expected) => {
      const { configRead } = await loadConfig();
      expect(configRead(key)).toBe(expected);
    });
  });

  describe('migration to version 2', () => {
    it('drops stored values that equal the previous defaults', async () => {
      window.localStorage.setItem(
        CONFIG_KEY,
        JSON.stringify({
          enableAdBlock: true,
          upgradeThumbnails: false,
          enableSponsorBlockIntro: true,
          hideLogo: true
        })
      );
      const { configRead } = await loadConfig();
      expect(configRead('upgradeThumbnails')).toBe(true);
      expect(configRead('enableSponsorBlockIntro')).toBe(false);
      expect(configRead('hideLogo')).toBe(true);
      expect(JSON.parse(window.localStorage.getItem(CONFIG_KEY)!)).toEqual({
        enableAdBlock: true,
        hideLogo: true
      });
      expect(window.localStorage.getItem(`${CONFIG_KEY}-version`)).toBe('2');
    });

    it('keeps explicit choices made after migrating', async () => {
      window.localStorage.setItem(`${CONFIG_KEY}-version`, '2');
      window.localStorage.setItem(
        CONFIG_KEY,
        JSON.stringify({ upgradeThumbnails: false })
      );
      const { configRead } = await loadConfig();
      expect(configRead('upgradeThumbnails')).toBe(false);
    });
  });
});
