import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/smooth-motion.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

describe('smooth-motion.css', () => {
  it('only transitions transform, which needs no layout or repaint', () => {
    const transitions = css.match(/transition:[^;]+;/g) ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    for (const rule of transitions) {
      expect(rule).toMatch(/^transition: transform /);
    }
  });

  it('never targets YouTube generated class names', () => {
    expect(css).not.toMatch(/\.[a-z0-9]{5,8}\b/i);
  });
});
