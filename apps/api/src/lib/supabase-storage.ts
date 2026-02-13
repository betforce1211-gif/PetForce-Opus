import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "pet-avatars";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for pet avatar uploads");
    }
    _supabase = createClient(url, key);
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

  return publicUrl;
}

export async function deletePetAvatar(path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
