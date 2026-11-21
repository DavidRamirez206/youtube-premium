import { describe, expect, it } from 'vitest';

import { computeListOffset } from '../src/ui/menu-scroll.js';

// Panel 600px high, list starts 100px down: 476px visible with a 24px margin.
const base = { listTop: 100, viewportHeight: 600, rowHeight: 50 };

describe('computeListOffset', () => {
  it('keeps the offset when the row is visible', () => {
    expect(computeListOffset({ ...base, offset: 0, rowTop: 200 })).toBe(0);
  });

  it('scrolls down just enough to show a row below the fold', () => {
    // Row bottom 550 must end at 476.
    expect(computeListOffset({ ...base, offset: 0, rowTop: 500 })).toBe(74);
  });

  it('scrolls up to a row above the current offset', () => {
    expect(computeListOffset({ ...base, offset: 300, rowTop: 120 })).toBe(120);
  });

  it('never returns a negative offset', () => {
    expect(computeListOffset({ ...base, offset: 10, rowTop: -5 })).toBe(0);
  });

  it('walking down every row keeps each one visible', () => {
    let offset = 0;
    for (let i = 0; i < 20; i++) {
      const rowTop = i * 60;
      offset = computeListOffset({ ...base, offset, rowTop });
      expect(rowTop - offset).toBeGreaterThanOrEqual(0);
      expect(rowTop + base.rowHeight - offset).toBeLessThanOrEqual(476);
    }
  });
});
