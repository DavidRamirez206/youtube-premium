// Single JSON.parse hook shared by every feature that rewrites YouTube TV
// API responses. The text is parsed once, then each registered transformer
// runs on the result inside its own try/catch: a failing transformer is
// logged and skipped, and the parsed value is always returned.

export type JsonObject = Record<string, any>;
export type JsonTransformer = (data: JsonObject) => void;

interface Entry {
  name: string;
  transform: JsonTransformer;
  innertubeOnly: boolean;
}

const entries: Entry[] = [];

/** The unpatched JSON.parse, for features that need a private copy. */
export const parseJson: typeof JSON.parse = JSON.parse.bind(JSON);

/** InnerTube (YouTube API) responses always carry a responseContext. */
export function isInnertubeResponse(value: unknown): value is JsonObject {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'responseContext' in value
  );
}

/**
 * Registers a transformer for parsed JSON objects. By default it only sees
 * YouTube API responses; pass `innertubeOnly: false` to receive every
 * parsed object. Returns a function that removes it.
 */
export function addJsonTransformer(
  name: string,
  transform: JsonTransformer,
  { innertubeOnly = true }: { innertubeOnly?: boolean } = {}
) {
  const entry: Entry = { name, transform, innertubeOnly };
  entries.push(entry);
  return () => {
    const index = entries.indexOf(entry);
    if (index >= 0) entries.splice(index, 1);
  };
}

/** Runs the transformers on an already parsed value. */
export function applyJsonTransformers(result: unknown) {
  if (!result || typeof result !== 'object' || !entries.length) return;
  const innertube = isInnertubeResponse(result);
  for (const entry of entries.slice()) {
    if (entry.innertubeOnly && !innertube) continue;
    try {
      entry.transform(result as JsonObject);
    } catch (e) {
      console.warn(`[json] ${entry.name} failed and was skipped`, e);
    }
  }
}

JSON.parse = function parse(
  text: string,
  reviver?: Parameters<typeof JSON.parse>[1]
) {
  const result: unknown = parseJson(text, reviver);
  applyJsonTransformers(result);
  return result;
} as typeof JSON.parse;
