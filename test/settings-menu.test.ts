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
      'Interface'
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
    expect(menu.selectedKey).toBe('autoAccountSelect');
  });
});
