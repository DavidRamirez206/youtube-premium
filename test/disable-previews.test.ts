import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/player_api', async (orig) => ({
  ...(await orig<typeof import('../src/player_api')>()),
  getPlayerManager: () => new Promise(() => {})
}));

const { stripPreviewCommands, installPreviewStopper } =
  await import('../src/features/disable-previews');
const { PlayerMode } = await import('../src/player_api');
const { configWrite } = await import('../src/core/config.js');

const tile = () => ({
  tileRenderer: {
    contentId: 'abc',
    onSelectCommand: { watchEndpoint: { videoId: 'abc' } },
    onFocusCommand: {
      clickTrackingParams: 'x',
      startInlinePlaybackCommand: {
        playbackEndpoint: { watchEndpoint: { videoId: 'abc' } }
      }
    }
  }
});

describe('stripPreviewCommands', () => {
  it('removes the preview command and the empty focus command', () => {
    const data = { items: [tile()] };
    expect(stripPreviewCommands(data)).toBe(1);
    const renderer = data.items[0]!.tileRenderer;
    expect(renderer).not.toHaveProperty('onFocusCommand');
    expect(renderer.onSelectCommand.watchEndpoint.videoId).toBe('abc');
  });

  it('keeps other commands run on focus', () => {
    const data = {
      onFocusCommand: {
        commandExecutorCommand: {
          commands: [
            { startInlinePlaybackCommand: {} },
            { logFocusCommand: { id: 1 } }
          ]
        }
      }
    };
    stripPreviewCommands(data);
    expect(data.onFocusCommand.commandExecutorCommand.commands).toEqual([
      { logFocusCommand: { id: 1 } }
    ]);
  });

  it('leaves responses without previews untouched', () => {
    const data = { a: [{ b: 1 }], c: { clickTrackingParams: 'x' } };
    const copy = structuredClone(data);
    expect(stripPreviewCommands(data)).toBe(0);
    expect(data).toEqual(copy);
  });
});

describe('JSON.parse hook', () => {
  it('strips previews only when the option is on', () => {
    const body = JSON.stringify({ items: [tile()] });
    configWrite('disablePreviews', false);
    expect(JSON.parse(body).items[0].tileRenderer).toHaveProperty(
      'onFocusCommand'
    );
    configWrite('disablePreviews', true);
    expect(JSON.parse(body).items[0].tileRenderer).not.toHaveProperty(
      'onFocusCommand'
    );
  });
});

describe('installPreviewStopper', () => {
  function setup(mode: number) {
    const manager = Object.assign(new EventTarget(), {
      player: { stopVideo: vi.fn() },
      playerMode: mode
    });
    installPreviewStopper(manager as never);
    return manager;
  }

  it('stops previews when the option is on', () => {
    configWrite('disablePreviews', true);
    const manager = setup(PlayerMode.PREVIEW);
    manager.dispatchEvent(new Event('playbackStart'));
    expect(manager.player.stopVideo).toHaveBeenCalled();
  });

  it('never stops regular videos', () => {
    configWrite('disablePreviews', true);
    const manager = setup(PlayerMode.NORMAL);
    manager.dispatchEvent(new Event('playbackStart'));
    expect(manager.player.stopVideo).not.toHaveBeenCalled();
  });

  it('does nothing when the option is off', () => {
    configWrite('disablePreviews', false);
    const manager = setup(PlayerMode.PREVIEW);
    manager.dispatchEvent(new Event('playbackStart'));
    expect(manager.player.stopVideo).not.toHaveBeenCalled();
  });
});
