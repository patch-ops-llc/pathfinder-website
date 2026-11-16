import { extensionOf } from '../forms/logic.ts';

export interface Upload {
  /** Field path the file was attached to, e.g. `resume`. */
  path: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
}

const starts = (bytes: Uint8Array, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 8192);
  for (const b of sample) {
    if (b === 0) return false;
  }
  return true;
}

const CHECKS: Record<string, (b: Uint8Array) => boolean> = {
  pdf: (b) => ascii(b, 0, 1024).includes('%PDF-'),
  png: (b) => starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: (b) => starts(b, [0xff, 0xd8, 0xff]),
  jpeg: (b) => starts(b, [0xff, 0xd8, 0xff]),
  gif: (b) => ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a',
  webp: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  heic: (b) => ascii(b, 4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(ascii(b, 8, 12)),
  docx: (b) => starts(b, ZIP),
  xlsx: (b) => starts(b, ZIP),
  doc: (b) => starts(b, OLE),
  xls: (b) => starts(b, OLE),
  rtf: (b) => ascii(b, 0, 5) === '{\\rtf',
  txt: looksLikeText,
  csv: looksLikeText,
};

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  xls: 'application/vnd.ms-excel',
  rtf: 'application/rtf',
  txt: 'text/plain',
  csv: 'text/csv',
};

/** True when the file's leading bytes are consistent with its extension. */
export function contentMatchesExtension(filename: string, bytes: Uint8Array): boolean {
  const check = CHECKS[extensionOf(filename)];
  return !!check && bytes.length > 0 && check(bytes);
}

/** Content type derived from the extension; the browser-supplied type is never trusted. */
export function contentTypeFor(filename: string): string {
  return CONTENT_TYPES[extensionOf(filename)] ?? 'application/octet-stream';
}

/** Reduce a client-supplied file name to a safe base name. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim();
  if (!cleaned) return 'upload';
  if (cleaned.length <= 120) return cleaned;
  const ext = extensionOf(cleaned);
  return `${cleaned.slice(0, 110)}.${ext}`;
}
