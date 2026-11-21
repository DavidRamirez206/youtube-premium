import { describe, expect, it } from 'vitest';
import { isShortsItem, removeShorts } from '../src/features/shorts';

const video = (id: string) => ({
  lockupViewModel: {
    contentId: id,
    contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
    rendererContext: {
      commandContext: {
        onTap: { innertubeCommand: { watchEndpoint: { videoId: id } } }
      }
    }
  }
});

const short = (id: string) => ({
  lockupViewModel: {
    contentId: id,
    contentType: 'LOCKUP_CONTENT_TYPE_SHORT',
    rendererContext: {
      commandContext: {
        onTap: { innertubeCommand: { reelWatchEndpoint: { videoId: id } } }
      }
    }
  }
});

const shelf = (
  items: unknown[],
  type = 'TVHTML5_SHELF_RENDERER_TYPE_GRID'
) => ({
  shelfRenderer: {
    tvhtml5ShelfRendererType: type,
    content: { horizontalListRenderer: { items } }
  }
});

describe('isShortsItem', () => {
  it('recognises Shorts tiles, shelves and menu entries', () => {
    expect(isShortsItem(short('a'))).toBe(true);
    expect(
      isShortsItem(shelf([video('a')], 'TVHTML5_SHELF_RENDERER_TYPE_SHORTS'))
    ).toBe(true);
    expect(
      isShortsItem({
        guideEntryRenderer: {
          navigationEndpoint: { reelWatchEndpoint: {} }
        }
      })
    ).toBe(true);
    expect(
      isShortsItem({
        tileRenderer: { onSelectCommand: { reelWatchEndpoint: {} } }
      })
    ).toBe(true);
  });

  it('recognises lockups that open the Shorts player', () => {
    const item = short('a');
    item.lockupViewModel.contentType = 'LOCKUP_CONTENT_TYPE_VIDEO';
    expect(isShortsItem(item)).toBe(true);
  });

  it('keeps videos, playlists and other entries', () => {
    expect(isShortsItem(video('a'))).toBe(false);
    expect(isShortsItem(shelf([video('a')]))).toBe(false);
    expect(
      isShortsItem({
        guideEntryRenderer: { navigationEndpoint: { browseEndpoint: {} } }
      })
    ).toBe(false);
    expect(isShortsItem(null)).toBe(false);
    expect(isShortsItem('text')).toBe(false);
  });
});

describe('removeShorts', () => {
  it('removes Shorts shelves and tiles from search results', () => {
    const data = {
      contents: {
        sectionListRenderer: {
          contents: [
            shelf([video('v1'), short('s1'), video('v2')]),
            shelf([short('s2')], 'TVHTML5_SHELF_RENDERER_TYPE_SHORTS'),
            shelf([video('v3')])
          ]
        }
      }
    };
    expect(removeShorts(data)).toBe(2);
    const shelves = data.contents.sectionListRenderer.contents;
    expect(shelves).toHaveLength(2);
    const ids = shelves.flatMap((s) =>
      s.shelfRenderer.content.horizontalListRenderer.items.map(
        (i) => (i as ReturnType<typeof video>).lockupViewModel.contentId
      )
    );
    expect(ids).toEqual(['v1', 'v2', 'v3']);
  });

  it('drops shelves left empty', () => {
    const data = {
      contents: [shelf([short('a'), short('b')]), shelf([video('v')])]
    };
    removeShorts(data);
    expect(data.contents).toHaveLength(1);
  });

  it('removes the Shorts entry from the side menu', () => {
    const data = {
      items: [
        {
          guideSectionRenderer: {
            items: [
              {
                guideEntryRenderer: {
                  navigationEndpoint: { browseEndpoint: {} }
                }
              },
              {
                guideEntryRenderer: {
                  navigationEndpoint: { reelWatchEndpoint: {} }
                }
              }
            ]
          }
        }
      ]
    };
    removeShorts(data);
    expect(data.items[0]!.guideSectionRenderer.items).toHaveLength(1);
  });

  it('keeps Shorts settings that are not list items', () => {
    const data = {
      startupBehaviours: [
        { launchToShorts: { resumeToShorts: { reelWatchEndpoint: {} } } }
      ]
    };
    expect(removeShorts(data)).toBe(0);
    expect(data.startupBehaviours).toHaveLength(1);
  });
});

describe('JSON.parse hook', () => {
  it('filters parsed responses only when the option is on', async () => {
    const { configWrite } = await import('../src/core/config.js');
    const body = JSON.stringify({
      responseContext: {},
      items: [short('s'), video('v')]
    });

    configWrite('removeShorts', false);
    expect(JSON.parse(body).items).toHaveLength(2);

    configWrite('removeShorts', true);
    expect(JSON.parse(body).items).toHaveLength(1);
  });
});
