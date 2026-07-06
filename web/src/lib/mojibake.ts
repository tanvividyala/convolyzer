/**
 * Instagram's export JSON writes UTF-8 bytes through a Latin-1 encoder,
 * producing mojibake (e.g. "â¤" instead of "❤"). Reverse it by
 * treating each JS string's char codes as raw Latin-1 bytes and re-decoding as UTF-8.
 */
export function fixMojibake(value: string): string {
  try {
    const bytes = Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

export function fixMojibakeDeep<T>(obj: T): T {
  if (typeof obj === 'string') {
    return fixMojibake(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => fixMojibakeDeep(item)) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = fixMojibakeDeep(v);
    }
    return out as unknown as T;
  }
  return obj;
}
