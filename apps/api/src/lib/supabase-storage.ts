import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const BUCKET = "pet-avatars";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    // env.SUPABASE_URL and env.SUPABASE_SERVICE_ROLE_KEY are guaranteed to
    // be present — they are validated at startup by the env schema.
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
