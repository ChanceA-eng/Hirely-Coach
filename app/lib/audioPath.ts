const AUDIO_EXT = ".mp3";

function sanitizeFilename(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/\.mp3$/i, "")
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "";
}

export function getAudioPath(filename: string): string {
  const safe = sanitizeFilename(filename);
  if (!safe) return "";
  return `/audio/${safe}${AUDIO_EXT}`;
}

export function toAudioSrc(source?: string | null): string {
  if (!source) return "";
  return getAudioPath(source);
}
