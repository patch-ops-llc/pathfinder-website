import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/images/**/*.{jpg,png}', {
  eager: true,
});

const byKey = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const key = path.replace('../assets/images/', '').replace(/\.(jpg|png)$/, '');
  byKey.set(key, mod.default);
}

/** Look up a source image by folder/name, e.g. `lines/energy` or `team/scott-west`. */
export function img(key: string): ImageMetadata {
  const found = byKey.get(key);
  if (!found) throw new Error(`Missing image: ${key}`);
  return found;
}
