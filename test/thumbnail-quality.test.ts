import { beforeEach, describe, expect, it, vi } from 'vitest';

const loaded: string[] = [];
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalHeight = 480;
  width = 1;
  height = 1;
  set src(value: string) {
    if (!value.startsWith('data:')) loaded.push(value);
  }
}
vi.stubGlobal('Image', FakeImage);

const { handleMutations } = await import('../src/features/thumbnail-quality');

const URL_HQ = 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg';

function thumbnail(url = URL_HQ) {
  const el = document.createElement('ytlr-thumbnail-details');
  el.style.backgroundImage = `url("${url}")`;
  return el;
}

const added = (node: Node) =>
  ({
    type: 'childList',
    addedNodes: [node] as unknown as NodeList
  }) as MutationRecord;

const styled = (node: Node, oldValue: string | null) =>
  ({ type: 'attributes', target: node, oldValue }) as MutationRecord;

describe('thumbnail upgrade observer', () => {
  beforeEach(() => {
    loaded.length = 0;
    window.location.hash = '#/';
    document.body.className = '';
  });

  it('upgrades thumbnails added to the page', () => {
    const wrapper = document.createElement('div');
    wrapper.appendChild(thumbnail());
    handleMutations([added(wrapper), added(thumbnail())]);
    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toContain('sddefault');
  });

  it('upgrades a reused thumbnail whose image changed', () => {
    handleMutations([
      styled(thumbnail(), 'background-image: url("https://x/old.jpg")')
    ]);
    expect(loaded).toHaveLength(1);
  });

  it('ignores style changes that are not thumbnails or keep the image', () => {
    const bar = document.createElement('div');
    bar.style.transform = 'translateX(10px)';
    const same = thumbnail();
    handleMutations([
      styled(bar, 'transform: translateX(0px)'),
      styled(same, `background-image: url("${URL_HQ}")`)
    ]);
    expect(loaded).toHaveLength(0);
  });

  it('does nothing on the watch page', () => {
    window.location.hash = '#/watch?v=abcdefghijk';
    handleMutations([added(thumbnail()), styled(thumbnail(), null)]);
    expect(loaded).toHaveLength(0);
  });
});

describe('backgroundUrlOf', () => {
  it('reads the address of a background without parsing CSS', async () => {
    const { backgroundUrlOf } =
      await import('../src/features/thumbnail-quality');
    expect(backgroundUrlOf('url("https://i.ytimg.com/a.jpg")')).toBe(
      'https://i.ytimg.com/a.jpg'
    );
    expect(
      backgroundUrlOf(
        "width: 10px; background-image: url('https://i.ytimg.com/b.jpg');"
      )
    ).toBe('https://i.ytimg.com/b.jpg');
    expect(backgroundUrlOf('color: red')).toBe('');
    expect(backgroundUrlOf(null)).toBe('');
  });
});
