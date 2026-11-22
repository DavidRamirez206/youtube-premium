import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/app_api', () => ({
  ResolveCommandRegistry: { getInstance: () => new Promise(() => {}) }
}));

const { addOptionsEntry, openOptions, OPTIONS_COMMAND } =
  await import('../src/features/guide-entry');
const { configWrite } = await import('../src/core/config.js');

const fixture = () =>
  JSON.parse(readFileSync('test/fixtures/guide.json', 'utf8')) as {
    items: { guideSectionRenderer: { items: Record<string, any>[] } }[];
  };

const titles = (items: Record<string, any>[]) =>
  items.map((i) => i.guideEntryRenderer.formattedTitle.simpleText);

describe('CT Options side menu entry', () => {
  it('goes right above YouTube Settings', () => {
    configWrite('language', 'en');
    const data = fixture();
    expect(addOptionsEntry(data)).toBe(true);
    const section = data.items.find((s) =>
      titles(s.guideSectionRenderer.items).includes('Settings')
    )!;
    expect(titles(section.guideSectionRenderer.items).slice(0, 2)).toEqual([
      'CT Options',
      'Settings'
    ]);
    expect(
      section.guideSectionRenderer.items[0]!.guideEntryRenderer
        .navigationEndpoint
    ).toHaveProperty(OPTIONS_COMMAND);
  });

  it('is added only once', () => {
    const data = fixture();
    addOptionsEntry(data);
    expect(addOptionsEntry(data)).toBe(false);
    const all = data.items.flatMap((s) => titles(s.guideSectionRenderer.items));
    expect(all.filter((t) => t === 'CT Options')).toHaveLength(1);
  });

  it('falls back to the end of the last section', () => {
    const data = {
      items: [{ guideSectionRenderer: { items: [] as Record<string, any>[] } }]
    };
    addOptionsEntry(data);
    expect(titles(data.items[0]!.guideSectionRenderer.items)).toEqual([
      'CT Options'
    ]);
  });

  it('ignores responses without a side menu', () => {
    expect(addOptionsEntry({ contents: {} })).toBe(false);
  });

  it('follows the language option', () => {
    configWrite('language', 'es');
    const data = fixture();
    addOptionsEntry(data);
    const all = data.items.flatMap((s) => titles(s.guideSectionRenderer.items));
    expect(all).toContain('Opciones CT');
    configWrite('language', 'auto');
  });

  it('is added automatically to side menu API responses', () => {
    configWrite('language', 'en');
    const raw = readFileSync('test/fixtures/guide.json', 'utf8');
    const response = JSON.parse(
      raw.replace('{', '{"responseContext":{},')
    ) as ReturnType<typeof fixture>;
    const all = response.items.flatMap((s) =>
      titles(s.guideSectionRenderer.items)
    );
    expect(all.filter((t) => t === 'CT Options')).toHaveLength(1);
  });

  it('opens the menu only with OK on the focused entry', () => {
    configWrite('language', 'en');
    const show = vi.fn();
    window.ytaf_showOptionsPanel = show;
    const entry = document.createElement('div');
    entry.tabIndex = 0;
    entry.textContent = ' CT Options ';
    const other = document.createElement('div');
    other.tabIndex = 0;
    other.textContent = 'Settings';
    document.body.append(entry, other);
    const youtube = vi.fn();
    document.addEventListener('keydown', youtube);
    document.addEventListener('keyup', youtube);
    const ok = (type: string) =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent(type, { keyCode: 13, bubbles: true })
      );

    entry.focus();
    expect(show).not.toHaveBeenCalled(); // focus alone does nothing
    ok('keydown');
    ok('keyup');
    expect(show).toHaveBeenCalledWith(true);
    expect(youtube).not.toHaveBeenCalled();

    other.focus();
    ok('keydown');
    ok('keyup');
    expect(show).toHaveBeenCalledOnce();
    expect(youtube).toHaveBeenCalledTimes(2);

    document.removeEventListener('keydown', youtube);
    document.removeEventListener('keyup', youtube);
    entry.remove();
    other.remove();
    configWrite('language', 'auto');
  });

  it('opens the ClearTube menu', () => {
    const show = vi.fn();
    window.ytaf_showOptionsPanel = show;
    openOptions();
    expect(show).toHaveBeenCalledWith(true);
  });
});
