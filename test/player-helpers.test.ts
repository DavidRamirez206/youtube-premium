import { describe, expect, it } from 'vitest';
import { requireElement } from '../src/player_api/helpers';

describe('requireElement', () => {
  it('waits for <body> when the script runs inside <head>', async () => {
    const body = document.body;
    body.remove();
    expect(document.body).toBeNull();

    const found = requireElement('.html5-video-player', HTMLElement);
    document.documentElement.appendChild(body);
    const player = document.createElement('div');
    player.className = 'html5-video-player';
    // Let the body observer fire before the player is added.
    await new Promise((r) => setTimeout(r, 0));
    body.appendChild(player);

    await expect(found).resolves.toBe(player);
    player.remove();
  });
});
