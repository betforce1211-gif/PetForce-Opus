import { describe, it, expect } from "vitest";
import { validateFileMagicBytes } from "./validate-file-type.js";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Minimal valid file headers (magic bytes)
// JPEG: FF D8 FF
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
// PNG: signature + minimal IHDR chunk
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, // IHDR chunk length (13)
  0x49, 0x48, 0x44, 0x52, // "IHDR"
  0x00, 0x00, 0x00, 0x01, // width: 1
  0x00, 0x00, 0x00, 0x01, // height: 1
  0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
  0x90, 0x77, 0x53, 0xde, // CRC
]);
// WebP: RIFF....WEBP
const WEBP_HEADER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x00, 0x00, 0x00, 0x00, // file size (placeholder)
  0x57, 0x45, 0x42, 0x50, // WEBP
]);
// PDF: %PDF
const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

describe("validateFileMagicBytes", () => {
  it("accepts a valid JPEG buffer", async () => {
    const result = await validateFileMagicBytes(JPEG_HEADER, ALLOWED_IMAGE_TYPES);
    expect(result).toBe("image/jpeg");
  });

  it("accepts a valid PNG buffer", async () => {
    const result = await validateFileMagicBytes(PNG_HEADER, ALLOWED_IMAGE_TYPES);
    expect(result).toBe("image/png");
  });

  it("accepts a valid WebP buffer", async () => {
    const result = await validateFileMagicBytes(WEBP_HEADER, ALLOWED_IMAGE_TYPES);
    expect(result).toBe("image/webp");
  });

  it("rejects a PDF disguised with image extension", async () => {
    const result = await validateFileMagicBytes(PDF_HEADER, ALLOWED_IMAGE_TYPES);
    expect(result).toBeNull();
  });

  it("rejects an empty buffer", async () => {
    const result = await validateFileMagicBytes(Buffer.alloc(0), ALLOWED_IMAGE_TYPES);
    expect(result).toBeNull();
  });

  it("rejects random bytes", async () => {
    const random = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    const result = await validateFileMagicBytes(random, ALLOWED_IMAGE_TYPES);
    expect(result).toBeNull();
  });

  it("rejects a valid file type not in the allowed list", async () => {
    // PDF is a valid file type but not in our allowed image types
    const result = await validateFileMagicBytes(PDF_HEADER, ["image/jpeg"]);
    expect(result).toBeNull();
  });
});
