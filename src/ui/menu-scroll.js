// Scroll position of the settings list.
//
// YouTube TV resets `scrollTop` on every element it does not own, so the list
// is moved with a CSS transform instead. This module only does the maths.

/**
 * Returns the new vertical offset (in px, >= 0) that keeps the selected row
 * fully visible inside the panel.
 *
 * @param {object} p
 * @param {number} p.offset Current offset of the list.
 * @param {number} p.rowTop Row top, relative to the list.
 * @param {number} p.rowHeight Row height.
 * @param {number} p.listTop Top of the list inside the panel (below the title).
 * @param {number} p.viewportHeight Visible height of the panel.
 * @param {number} [p.margin] Space kept below the last visible row.
 */
export function computeListOffset({
  offset,
  rowTop,
  rowHeight,
  listTop,
  viewportHeight,
  margin = 24
}) {
  const visibleHeight = viewportHeight - listTop - margin;
  const rowBottom = rowTop + rowHeight;

  if (rowBottom - offset > visibleHeight) {
    return Math.max(0, rowBottom - visibleHeight);
  }
  if (rowTop - offset < 0) {
    return Math.max(0, rowTop);
  }
  return offset;
}
