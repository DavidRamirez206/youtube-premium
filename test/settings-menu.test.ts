import { beforeEach, describe, expect, it, vi } from 'vitest';

async function setup() {
  vi.resetModules();
  const config = await import('../src/core/config.js');
  const { createSettingsMenu } = await import('../src/ui/settings-menu.js');
  const menu = createSettingsMenu();
  document.body.replaceChildren(menu.element);
  menu.open();
  return { menu, config };
}

const rowLabels = () =>
  [...document.querySelectorAll('.ctv-menu-row-label')].map(
    (n) => n.textContent
  );

describe('settings menu', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
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
      'About'
    ]);
    expect(rowLabels()[0]).toBe('Block ads');
  });

  it('shows the current value of each switch', async () => {
    await setup();
    const row = document.querySelector('[data-key="enableAdBlock"]')!;
    expect(row.querySelector('[data-role="value"]')!.textContent).toBe('ON');
    const intro = document.querySelector(
      '[data-key="enableSponsorBlockIntro"]'
    )!;
    expect(intro.querySelector('[data-role="value"]')!.textContent).toBe('OFF');
  });

  it('toggles the selected option and asks for a reload on close', async () => {
    const { menu, config } = await setup();
    menu.activate();
    expect(config.configRead('enableAdBlock')).toBe(false);
    expect(menu.close()).toBe(true);
  });

  it('does not ask for a reload for live options', async () => {
    const { menu, config } = await setup();
    while (menu.selectedKey !== 'hideLogo') menu.down();
    menu.activate();
    expect(config.configRead('hideLogo')).toBe(true);
    expect(menu.close()).toBe(false);
  });

  it('skips SponsorBlock categories while SponsorBlock is off', async () => {
    const { menu } = await setup();
    menu.down(); // SponsorBlock
    expect(menu.selectedKey).toBe('enableSponsorBlock');
    menu.activate(); // turn it off
    menu.down();
    expect(menu.selectedKey).toBe('forceHighResVideo');
    expect(
      document
        .querySelector('[data-key="enableSponsorBlockSponsor"]')!
        .classList.contains('ctv-disabled')
    ).toBe(true);
  });

  it('marks pending changes in the header', async () => {
    const { menu } = await setup();
    menu.activate();
    expect(document.getElementById('ytaf-options-panel')!.classList).toContain(
      'ctv-pending'
    );
  });

  it('does not move past the first or last option', async () => {
    const { menu } = await setup();
    menu.up();
    expect(menu.selectedKey).toBe('enableAdBlock');
    for (let i = 0; i < 50; i++) menu.down();
    expect(menu.selectedKey).toBe('action:restoreDefaults');
  });

  it('changes choice options with LEFT and RIGHT without wrapping', async () => {
    const { menu, config } = await setup();
    while (menu.selectedKey !== 'playbackSpeed') menu.down();
    menu.right();
    expect(config.configRead('playbackSpeed')).toBe(1.1);
    menu.left();
    menu.left();
    menu.left();
    expect(config.configRead('playbackSpeed')).toBe(0.75);
    const value = document.querySelector(
      '[data-key="playbackSpeed"] [data-role="value"]'
    )!;
    expect(value.textContent).toBe('0.75x');
    expect(menu.close()).toBe(false);
  });

  it('cycles choice options with OK', async () => {
    const { menu, config } = await setup();
    while (menu.selectedKey !== 'playbackSpeed') menu.down();
    for (let i = 0; i < 6; i++) menu.activate();
    expect(config.configRead('playbackSpeed')).toBe(0.75);
  });

  it('shows the position of the selected row', async () => {
    const { menu } = await setup();
    const position = () =>
      document.querySelector('.ctv-menu-position')!.textContent;
    expect(position()).toMatch(/^1 of \d+$/);
    menu.down();
    expect(position()).toMatch(/^2 of /);
  });

  it('dims the picker arrow at the end of the list', async () => {
    const { menu, config } = await setup();
    while (menu.selectedKey !== 'playbackSpeed') menu.down();
    const picker = document.querySelector(
      '[data-key="playbackSpeed"] .ctv-menu-choice'
    )!;
    expect(picker.classList).not.toContain('ctv-at-end');
    for (let i = 0; i < 10; i++) menu.right();
    expect(config.configRead('playbackSpeed')).toBe(2);
    expect(picker.classList).toContain('ctv-at-end');
  });

  it('restores defaults only after a second OK', async () => {
    const { menu, config } = await setup();
    menu.activate(); // ad blocking off
    expect(config.configRead('enableAdBlock')).toBe(false);
    for (let i = 0; i < 50; i++) menu.down();
    expect(menu.selectedKey).toBe('action:restoreDefaults');

    menu.activate();
    expect(config.configRead('enableAdBlock')).toBe(false);
    expect(
      document.querySelector('[data-key="action:restoreDefaults"]')!.textContent
    ).toContain('Press OK again');

    menu.activate();
    expect(config.configRead('enableAdBlock')).toBe(true);
    expect(menu.close()).toBe(true);
  });

  it('cancels the restore confirmation when moving away', async () => {
    const { menu, config } = await setup();
    menu.activate();
    for (let i = 0; i < 50; i++) menu.down();
    menu.activate();
    menu.up();
    menu.down();
    menu.activate();
    expect(config.configRead('enableAdBlock')).toBe(false);
  });

  it('shows the data attribution required by the licenses', async () => {
    await setup();
    expect(document.querySelector('.ctv-menu-about')!.textContent).toContain(
      'CC BY-NC-SA 4.0'
    );
  });

  it('keeps working when one row is broken', async () => {
    const { menu, config } = await setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    document
      .querySelector('[data-key="hideLogo"] [data-role="value"]')!
      .remove();
    expect(() => menu.down()).not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      '[ClearTube] settings row hideLogo:',
      expect.any(String)
    );
    // Other rows still render and work.
    menu.up();
    menu.activate();
    expect(config.configRead('enableAdBlock')).toBe(false);
    expect(
      document.querySelector('[data-key="enableAdBlock"] [data-role="value"]')!
        .textContent
    ).toBe('OFF');
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
