/**
 * Prototype-only, in-memory store of uploaded file bytes (as object URLs) keyed by file ID.
 * Metadata is persisted to localStorage; bytes are NOT and disappear on page refresh.
 */
const urls = new Map<string, string>();

export function rememberFile(fileId: string, file: File) {
  urls.set(fileId, URL.createObjectURL(file));
}

export function sessionFileUrl(fileId: string) {
  return urls.get(fileId);
}
