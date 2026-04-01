import sharp from "sharp";

/** Thumbnail size: 150px wide, used in list views */
const THUMB_WIDTH = 150;
/** Medium size: 400px wide, used in detail views */
const MEDIUM_WIDTH = 400;
/** Blur placeholder: tiny 32px image encoded as base64 data URI */
const BLUR_WIDTH = 32;
/** WebP quality setting */
const WEBP_QUALITY = 80;

export interface ImageVariants {
  /** 150px wide thumbnail as WebP */
  thumbnail: Buffer;
  /** 400px wide medium as WebP */
  medium: Buffer;
  /** Full-size WebP conversion */
  webp: Buffer;
  /** Tiny base64-encoded blur placeholder (data URI) */
  blurHash: string;
}

/**
 * Process an uploaded image buffer into optimized variants.
 * Generates thumbnail (150px), medium (400px), full-size WebP,
 * and a tiny blur placeholder hash.
 */
export async function generateImageVariants(
  buffer: Buffer
): Promise<ImageVariants> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 800;

  const [thumbnail, medium, webp, blurBuffer] = await Promise.all([
    // 150px thumbnail as WebP
    sharp(buffer)
      .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),

    // 400px medium as WebP
    sharp(buffer)
      .resize(MEDIUM_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),

    // Full-size WebP (only convert if source is larger than medium, otherwise skip resize)
    width > MEDIUM_WIDTH
      ? sharp(buffer).webp({ quality: WEBP_QUALITY }).toBuffer()
      : sharp(buffer).webp({ quality: WEBP_QUALITY }).toBuffer(),

    // Tiny blur placeholder
    sharp(buffer)
      .resize(BLUR_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: 20 })
      .toBuffer(),
  ]);

  const blurHash = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  return { thumbnail, medium, webp, blurHash };
}

/**
 * Generate avatar-specific variants (just thumbnail + blur hash).
 * Avatars are smaller so we only need a 150px thumbnail and blur placeholder.
 */
export async function generateAvatarVariants(
  buffer: Buffer
): Promise<{ thumbnail: Buffer; blurHash: string }> {
  const [thumbnail, blurBuffer] = await Promise.all([
    sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_WIDTH, { fit: "cover" })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),

    sharp(buffer)
      .resize(BLUR_WIDTH, BLUR_WIDTH, { fit: "cover" })
      .webp({ quality: 20 })
      .toBuffer(),
  ]);

  const blurHash = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

  return { thumbnail, blurHash };
}
