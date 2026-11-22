import { beforeEach, describe, expect, it, vi } from 'vitest';

async function setup() {
  vi.resetModules();
  const config = await import('../src/core/config.js');
  const { createSettingsMenu, APPLY_ACTION, RESET_ACTION } =
    await import('../src/ui/settings-menu.js');
  const notify = vi.fn();
  const menu = createSettingsMenu({ notify });
  document.body.replaceChildren(menu.element);
  const closed = vi.fn();
  menu.open(closed);
  const goTo = (key: string) => {
    for (let i = 0; i < 60 && menu.selectedKey !== key; i++) {
      menu.handleKey('down');
    }
    expect(menu.selectedKey).toBe(key);
  };
  return { menu, config, notify, closed, goTo, APPLY_ACTION, RESET_ACTION };
}

const row = (key: string) =>
  document.querySelector(`[data-key="${key}"]`) as HTMLElement;
const valueText = (key: string) =>
  row(key).querySelector('[data-role="value"]')!.textContent;
const hintText = (key: string) =>
  row(key).querySelector('[data-role="hint"]')!.textContent;

describe('settings menu', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
  });

  it('groups options under section headings in order', async () => {
    await setup();
    const sections = [...document.querySelectorAll('.ctv-menu-section')].map(
      (n) => n.textContent
    );
    expect(sections).toEqual([
      'Ads and sponsors',
      'Playback',
      'Content',
      'Interface',
      'Actions',
      'About'
    ]);
  });

  it('stages changes until they are applied', async () => {
    const { menu, config, notify, goTo, APPLY_ACTION } = await setup();
    menu.handleKey('ok');
    expect(config.configRead('enableAdBlock')).toBe(true);
    expect(valueText('enableAdBlock')).toBe('OFF');
    expect(row('enableAdBlock').classList).toContain('ctv-modified');
    expect(menu.unsavedChanges).toBe(1);
    expect(document.querySelector('.ctv-menu-pending')!.textContent).toBe(
      '1 unsaved change'
    );

    goTo(APPLY_ACTION);
    menu.handleKey('ok');
    expect(config.configRead('enableAdBlock')).toBe(false);
    expect(menu.unsavedChanges).toBe(0);
    expect(notify).toHaveBeenCalledWith('Settings applied');
    expect(menu.isOpen()).toBe(true);
  });

  it('forgets a change that is undone before applying', async () => {
    const { menu } = await setup();
    menu.handleKey('ok');
    menu.handleKey('ok');
    expect(menu.unsavedChanges).toBe(0);
  });

  it('closes directly when nothing changed', async () => {
    const { menu, closed } = await setup();
    menu.handleKey('back');
    expect(menu.isOpen()).toBe(false);
    expect(closed).toHaveBeenCalled();
  });

  describe('unsaved changes bar', () => {
    it('applies and closes', async () => {
      const { menu, config } = await setup();
      menu.handleKey('ok');
      menu.handleKey('back');
      expect(menu.dialogOpen).toBe(true);
      expect(menu.isOpen()).toBe(true);
      menu.handleKey('ok');
      expect(menu.isOpen()).toBe(false);
      expect(config.configRead('enableAdBlock')).toBe(false);
    });

    it('discards and closes', async () => {
      const { menu, config, notify } = await setup();
      menu.handleKey('ok');
      menu.handleKey('back');
      menu.handleKey('right');
      menu.handleKey('ok');
      expect(menu.isOpen()).toBe(false);
      expect(config.configRead('enableAdBlock')).toBe(true);
      expect(notify).toHaveBeenCalledWith('Changes discarded');
    });

    it('keeps editing with the third button or Back', async () => {
      const { menu } = await setup();
      menu.handleKey('ok');
      menu.handleKey('back');
      menu.handleKey('right');
      menu.handleKey('right');
      menu.handleKey('right');
      menu.handleKey('ok');
      expect(menu.dialogOpen).toBe(false);
      expect(menu.isOpen()).toBe(true);
      expect(menu.unsavedChanges).toBe(1);

      menu.handleKey('back');
      menu.handleKey('back');
      expect(menu.dialogOpen).toBe(false);
      expect(menu.isOpen()).toBe(true);
    });

    it('ignores navigation keys while the bar is shown', async () => {
      const { menu } = await setup();
      menu.handleKey('ok');
      menu.handleKey('back');
      menu.handleKey('down');
      expect(menu.selectedKey).toBe('enableAdBlock');
    });
  });

  it('shows dependent options as off while their parent is off', async () => {
    const { menu, goTo } = await setup();
    expect(valueText('enableDeArrowThumbnails')).toBe('OFF');
    expect(row('enableDeArrowThumbnails').classList).toContain('ctv-disabled');
    expect(hintText('enableDeArrowThumbnails')).toBe('Turn on "DeArrow" first');

    goTo('enableDeArrow');
    menu.handleKey('ok');
    expect(valueText('enableDeArrowThumbnails')).toBe('ON');
    expect(row('enableDeArrowThumbnails').classList).not.toContain(
      'ctv-disabled'
    );
    menu.handleKey('down');
    expect(menu.selectedKey).toBe('enableDeArrowThumbnails');
    menu.handleKey('ok');
    expect(valueText('enableDeArrowThumbnails')).toBe('OFF');
  });

  it('skips SponsorBlock categories while SponsorBlock is off', async () => {
    const { menu } = await setup();
    menu.handleKey('down');
    expect(menu.selectedKey).toBe('enableSponsorBlock');
    menu.handleKey('ok');
    menu.handleKey('down');
    expect(menu.selectedKey).toBe('forceHighResVideo');
  });

  it('changes choice options with LEFT and RIGHT', async () => {
    const { menu, goTo, config } = await setup();
    goTo('playbackSpeed');
    menu.handleKey('right');
    expect(valueText('playbackSpeed')).toBe('1.1x');
    for (let i = 0; i < 10; i++) menu.handleKey('right');
    expect(valueText('playbackSpeed')).toBe('2x');
    expect(
      row('playbackSpeed').querySelector('.ctv-menu-choice')!.classList
    ).toContain('ctv-at-end');
    expect(config.configRead('playbackSpeed')).toBe(1);
  });

  it('switches to Spanish as soon as the language is applied', async () => {
    const { menu, goTo, APPLY_ACTION } = await setup();
    goTo('language');
    menu.handleKey('right'); // English
    menu.handleKey('right'); // Español
    expect(valueText('language')).toBe('Español');
    goTo(APPLY_ACTION);
    menu.handleKey('ok');
    expect(document.querySelector('.ctv-menu-section')!.textContent).toBe(
      'Anuncios y patrocinios'
    );
    expect(row('enableAdBlock').textContent).toContain('Bloquear anuncios');
    expect(valueText('enableAdBlock')).toBe('SÍ');
  });

  it('stages defaults with Restore defaults', async () => {
    const { menu, config, goTo, RESET_ACTION } = await setup();
    config.configWrite('hideLogo', true);
    goTo(RESET_ACTION);
    menu.handleKey('ok');
    expect(config.configRead('hideLogo')).toBe(true);
    expect(valueText('hideLogo')).toBe('OFF');
    expect(menu.unsavedChanges).toBe(1);
  });

  it('shows the position and the license attribution', async () => {
    const { menu } = await setup();
    const position = () =>
      document.querySelector('.ctv-menu-position')!.textContent;
    expect(position()).toMatch(/^1 of \d+$/);
    menu.handleKey('down');
    expect(position()).toMatch(/^2 of /);
    expect(document.querySelector('.ctv-menu-about')!.textContent).toContain(
      'CC BY-NC-SA 4.0'
    );
  });

  it('keeps working when one row is broken', async () => {
    const { menu, config } = await setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    row('hideLogo').querySelector('[data-role="value"]')!.remove();
    expect(() => menu.handleKey('down')).not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      '[YouTube Premium] settings row hideLogo:',
      expect.any(String)
    );
    menu.handleKey('up');
    menu.handleKey('ok');
    expect(valueText('enableAdBlock')).toBe('OFF');
    expect(config.configRead('enableAdBlock')).toBe(true);
  });
});

describe('menuScale', () => {
  it('fits the 1080p design into smaller screens', async () => {
    const { menuScale } = await import('../src/ui/settings-menu.js');
    expect(menuScale(1920, 1080)).toBe(1);
    expect(menuScale(1280, 720)).toBeCloseTo(2 / 3);
    expect(menuScale(3840, 2160)).toBe(1);
    expect(menuScale(0, 0)).toBe(1);
  });
});
