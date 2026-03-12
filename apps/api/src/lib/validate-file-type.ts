import { fileTypeFromBuffer } from "file-type";

/**
 * Validates a file buffer's magic bytes against a list of allowed MIME types.
 * Returns the detected MIME type if valid, or null if invalid/undetectable.
 */
export async function validateFileMagicBytes(
  buffer: Buffer,
  allowedTypes: readonly string[]
): Promise<string | null> {
  const result = await fileTypeFromBuffer(buffer);

  if (!result) {
    return null;
  }

  if (!allowedTypes.includes(result.mime)) {
    return null;
  }

  return result.mime;
}
