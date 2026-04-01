import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const BUCKET = "pet-avatars";

let _supabase: SupabaseClient | null = null;

/** Returns true if Supabase Storage credentials are configured. */
export function isStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable file uploads."
      );
    }
    _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export async function uploadPetAvatar(
  householdId: string,
  petId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = extFromMime(mimeType);
  const path = `${householdId}/${petId}.${ext}`;

  const sb = getSupabase();

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = sb.storage.from(BUCKET).getPublicUrl(path);

  // Append cache-buster so browsers fetch the new image after a replace
  return `${publicUrl}?t=${Date.now()}`;
}

export async function uploadPetAvatarThumbnail(
  householdId: string,
  petId: string,
  buffer: Buffer
): Promise<string> {
  const path = `${householdId}/${petId}_thumb.webp`;

  const sb = getSupabase();

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw new Error(`Avatar thumbnail upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = sb.storage.from(BUCKET).getPublicUrl(path);

  return `${publicUrl}?t=${Date.now()}`;
}

export async function deletePetAvatar(path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

// --- Pet Photos (Gallery) ---

const PHOTO_BUCKET = "pet-photos";

export async function uploadPetPhoto(
  householdId: string,
  petId: string,
  photoId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = extFromMime(mimeType);
  const path = `${householdId}/${petId}/${photoId}.${ext}`;

  const sb = getSupabase();

  const { error } = await sb.storage
    .from(PHOTO_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  return publicUrl;
}

export interface PhotoVariantUrls {
  thumbnailUrl: string;
  mediumUrl: string;
  webpUrl: string;
}

/**
 * Upload optimized image variants (thumbnail, medium, webp) alongside the original.
 */
export async function uploadPetPhotoVariants(
  householdId: string,
  petId: string,
  photoId: string,
  variants: { thumbnail: Buffer; medium: Buffer; webp: Buffer }
): Promise<PhotoVariantUrls> {
  const sb = getSupabase();
  const basePath = `${householdId}/${petId}/${photoId}`;

  const uploads = [
    { path: `${basePath}_thumb.webp`, buffer: variants.thumbnail, key: "thumbnailUrl" as const },
    { path: `${basePath}_medium.webp`, buffer: variants.medium, key: "mediumUrl" as const },
    { path: `${basePath}.webp`, buffer: variants.webp, key: "webpUrl" as const },
  ];

  const results: PhotoVariantUrls = { thumbnailUrl: "", mediumUrl: "", webpUrl: "" };

  await Promise.all(
    uploads.map(async ({ path, buffer, key }) => {
      const { error } = await sb.storage
        .from(PHOTO_BUCKET)
        .upload(path, buffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (error) {
        throw new Error(`Variant upload failed (${key}): ${error.message}`);
      }

      const {
        data: { publicUrl },
      } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      results[key] = publicUrl;
    })
  );

  return results;
}

export async function deletePetPhotoFile(
  householdId: string,
  petId: string,
  photoId: string,
  url: string
): Promise<void> {
  const urlPath = new URL(url).pathname;
  const ext = urlPath.split(".").pop() || "jpg";
  const path = `${householdId}/${petId}/${photoId}.${ext}`;

  const { error } = await getSupabase().storage.from(PHOTO_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Photo delete failed: ${error.message}`);
  }
}
