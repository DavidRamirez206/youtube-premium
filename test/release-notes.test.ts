import { describe, expect, it } from 'vitest';

import { parseCommit, renderNotes } from '../tools/release-notes.js';

describe('parseCommit', () => {
  it('parses type, scope and subject', () => {
    expect(parseCommit('feat(ui): add speed menu', '', 'abc1234')).toEqual({
      type: 'feat',
      scope: 'ui',
      breaking: false,
      subject: 'add speed menu',
      hash: 'abc1234'
    });
  });

  it('detects breaking changes from ! and the footer', () => {
    expect(parseCommit('feat!: drop webOS 3', '', 'a')?.breaking).toBe(true);
    expect(
      parseCommit('refactor: x', 'BREAKING CHANGE: config reset', 'b')?.breaking
    ).toBe(true);
  });

  it('lists security fixes under their own type', () => {
    expect(parseCommit('fix(security): close proxy', '', 'c')?.type).toBe(
      'security'
    );
  });

  it('ignores non-conventional subjects', () => {
    expect(parseCommit('Change the proxy design', '', 'd')).toBeNull();
  });
});

describe('renderNotes', () => {
  it('groups commits by section in a stable order', () => {
    const notes = renderNotes(
      [
        parseCommit('fix(loader): a', '', '1')!,
        parseCommit('feat: b', '', '2')!,
        parseCommit('chore: c', '', '3')!,
        parseCommit('fix(security): d', '', '4')!
      ],
      {
        repoUrl: 'https://github.com/o/r',
        previousTag: 'v1.0.0',
        tag: 'v1.1.0'
      }
    );
    expect(notes.indexOf('### Features')).toBeLessThan(
      notes.indexOf('### Bug fixes')
    );
    expect(notes).toContain(
      '- **loader:** a ([`1`](https://github.com/o/r/commit/1))'
    );
    expect(notes).toContain('### Security');
    expect(notes).toContain('compare/v1.0.0...v1.1.0');
  });
});
