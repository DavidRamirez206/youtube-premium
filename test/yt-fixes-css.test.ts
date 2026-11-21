import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/yt-fixes.css', 'utf8');

function selectorsWith(property: string) {
  return css
    .split('}')
    .filter((rule) => rule.includes(property))
    .flatMap((rule) =>
      rule
        .split('{')[0]!
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split(',')
        .map((s) => s.trim())
    );
}

describe('yt-fixes.css', () => {
  it('never darkens every shadow element of the interface', () => {
    for (const selector of selectorsWith('background')) {
      expect(selector).not.toBe("[idomkey='shadow']");
    }
  });

  it('keeps the watch page shadow fix', () => {
    const selectors = selectorsWith('background-image');
    expect(selectors).toContain('.ytLrWatchDefaultShadow');
    expect(selectors).toContain("ytlr-watch-default > [idomkey='shadow']");
  });
});
