import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addJsonTransformer,
  isInnertubeResponse
} from '../src/hooks/json-parse';

const removers: (() => void)[] = [];
const add = (...args: Parameters<typeof addJsonTransformer>) =>
  removers.push(addJsonTransformer(...args));

describe('JSON.parse registry', () => {
  afterEach(() => {
    for (const remove of removers.splice(0)) remove();
  });

  it('recognises YouTube API responses', () => {
    expect(isInnertubeResponse({ responseContext: {} })).toBe(true);
    expect(isInnertubeResponse({ a: 1 })).toBe(false);
    expect(isInnertubeResponse([])).toBe(false);
    expect(isInnertubeResponse(null)).toBe(false);
  });

  it('runs API transformers only on API responses', () => {
    const seen = vi.fn();
    add('test', seen);
    JSON.parse('{"enableAdBlock":true}');
    JSON.parse('[1,2]');
    JSON.parse('"text"');
    expect(seen).not.toHaveBeenCalled();
    JSON.parse('{"responseContext":{}}');
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('lets generic transformers see every object', () => {
    const seen = vi.fn();
    add('test', seen, { innertubeOnly: false });
    JSON.parse('{"a":1}');
    expect(seen).toHaveBeenCalledWith({ a: 1 });
  });

  it('isolates a failing transformer from the others', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    add('broken', () => {
      throw new Error('boom');
    });
    add('working', (data) => {
      data.marked = true;
    });
    const result = JSON.parse('{"responseContext":{}}');
    expect(result).toEqual({ responseContext: {}, marked: true });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('broken'),
      expect.any(Error)
    );
  });

  it('still throws on invalid JSON and supports revivers', () => {
    expect(() => JSON.parse('{bad')).toThrow(SyntaxError);
    expect(JSON.parse('{"n":1}', (k, v) => (k === 'n' ? v + 1 : v))).toEqual({
      n: 2
    });
  });
});
