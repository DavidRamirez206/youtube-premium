// Builds Markdown release notes from the conventional commits between the
// previous tag and HEAD.
//
// Usage: node tools/release-notes.js [current-tag] > notes.md

import { execFileSync } from 'node:child_process';

const SECTIONS = /** @type {const} */ ([
  ['feat', 'Features'],
  ['fix', 'Bug fixes'],
  ['perf', 'Performance'],
  ['security', 'Security'],
  ['docs', 'Documentation'],
  ['refactor', 'Refactoring'],
  ['build', 'Build and tooling'],
  ['ci', 'Build and tooling'],
  ['test', 'Tests'],
  ['chore', 'Maintenance'],
  ['style', 'Maintenance']
]);

// Last upstream (TheMysticle/youtube-tizenos) commit before ClearTube TV.
// The first release lists only the changes made after it.
const FORK_BASE = '72268c87bfe7e014bdf23e59e2e64ebf61d8e72d';

const HEADER = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;

/**
 * @typedef {{ type: string, scope?: string, breaking: boolean, subject: string, hash: string }} Commit
 */

/**
 * @param {string} subject first line of the commit message
 * @param {string} body rest of the message
 * @param {string} hash short hash
 * @returns {Commit | null}
 */
export function parseCommit(subject, body, hash) {
  const m = HEADER.exec(subject.trim());
  if (!m) return null;
  const [, rawType = '', scope, bang, text = ''] = m;
  // fix(security) is listed under Security.
  const type = rawType === 'fix' && scope === 'security' ? 'security' : rawType;
  return {
    type,
    ...(scope ? { scope } : {}),
    breaking: Boolean(bang) || /^BREAKING CHANGE:/m.test(body),
    subject: text,
    hash
  };
}

/**
 * @param {Commit[]} commits
 * @param {{ repoUrl?: string, previousTag?: string, tag?: string }} [opts]
 */
export function renderNotes(commits, opts = {}) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  const breaking = [];
  const link = (/** @type {Commit} */ c) =>
    opts.repoUrl ? `[\`${c.hash}\`](${opts.repoUrl}/commit/${c.hash})` : c.hash;

  for (const c of commits) {
    const line = `- ${c.scope ? `**${c.scope}:** ` : ''}${c.subject} (${link(c)})`;
    if (c.breaking) breaking.push(line);
    const title = SECTIONS.find(([t]) => t === c.type)?.[1];
    if (!title) continue;
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title)?.push(line);
  }

  const out = [];
  if (breaking.length) out.push('### ⚠️ Breaking changes', '', ...breaking, '');
  for (const title of new Set(SECTIONS.map(([, t]) => t))) {
    const lines = groups.get(title);
    if (lines?.length) out.push(`### ${title}`, '', ...lines, '');
  }
  if (opts.repoUrl && opts.previousTag && opts.tag) {
    out.push(
      `**Full changelog:** ${opts.repoUrl}/compare/${opts.previousTag}...${opts.tag}`
    );
  }
  return out.join('\n').trim() + '\n';
}

/** @param {string[]} args */
function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tag = process.argv[2] ?? 'HEAD';
  let previousTag = '';
  try {
    previousTag = git(['describe', '--tags', '--abbrev=0', `${tag}^`]);
  } catch {
    // First release: use the whole history.
  }
  const range = `${previousTag || FORK_BASE}..${tag}`;
  const sep = '\u001e';
  const raw = git([
    'log',
    '--no-merges',
    `--format=%h%x1f%s%x1f%b${sep}`,
    range
  ]);
  const commits = raw
    .split(sep)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash = '', subject = '', body = ''] = entry.split('\u001f');
      return parseCommit(subject, body, hash);
    })
    .filter((c) => c !== null);

  const repoUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
      : undefined;
  process.stdout.write(
    renderNotes(commits, {
      ...(repoUrl ? { repoUrl } : {}),
      ...(previousTag ? { previousTag } : {}),
      tag
    })
  );
}
