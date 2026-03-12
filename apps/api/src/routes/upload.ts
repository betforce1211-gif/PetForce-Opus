import { Hono } from "hono";
import { eq, and, count as drizzleCount } from "drizzle-orm";
import { db, pets, members, petPhotos } from "@petforce/db";
import {
  PET_AVATAR_MAX_SIZE,
  PET_AVATAR_ALLOWED_TYPES,
  PET_PHOTO_MAX_SIZE,
  PET_PHOTO_ALLOWED_TYPES,
  PET_PHOTO_MAX_PER_PET,
} from "@petforce/core";
import { verifyClerkToken } from "../lib/clerk-auth.js";
import { uploadPetAvatar, uploadPetPhoto } from "../lib/supabase-storage.js";
import { validateFileMagicBytes } from "../lib/validate-file-type.js";

const uploadApp = new Hono();

uploadApp.post("/pet-avatar", async (c) => {
  // --- Auth ---
  const userId = await verifyClerkToken(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // --- Parse multipart body ---
  const body = await c.req.parseBody();
  const file = body["file"];
  const petId = body["petId"];

  if (!petId || typeof petId !== "string") {
    return c.json({ error: "petId is required" }, 400);
  }

  if (!file || !(file instanceof File)) {
    return c.json({ error: "file is required" }, 400);
  }

  // --- Validate file ---
  if (!(PET_AVATAR_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return c.json(
      { error: `Invalid file type. Allowed: ${PET_AVATAR_ALLOWED_TYPES.join(", ")}` },
      400
    );
  }

  if (file.size > PET_AVATAR_MAX_SIZE) {
    return c.json(
      { error: `File too large. Max size: ${PET_AVATAR_MAX_SIZE / 1024 / 1024}MB` },
      400
    );
  }

  // --- Verify pet exists and user is a member of its household ---
  const [pet] = await db.select().from(pets).where(eq(pets.id, petId));
  if (!pet) {
    return c.json({ error: "Pet not found" }, 404);
  }

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.householdId, pet.householdId), eq(members.userId, userId)));

  if (!membership) {
    return c.json({ error: "You are not a member of this pet's household" }, 403);
  }

  // --- Validate file magic bytes ---
  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = await validateFileMagicBytes(buffer, PET_AVATAR_ALLOWED_TYPES);
  if (!detectedMime) {
    return c.json(
      { error: `File content does not match an allowed image type. Allowed: ${PET_AVATAR_ALLOWED_TYPES.join(", ")}` },
      400
    );
  }

  // --- Upload to Supabase Storage ---
  const avatarUrl = await uploadPetAvatar(pet.householdId, petId, buffer, detectedMime);

  // --- Update pet record ---
  await db
    .update(pets)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(pets.id, petId));

  return c.json({ avatarUrl });
});

uploadApp.post("/pet-photo", async (c) => {
  // --- Auth ---
  const userId = await verifyClerkToken(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // --- Parse multipart body ---
  const body = await c.req.parseBody();
  const file = body["file"];
  const petId = body["petId"];
  const caption = body["caption"];
  const takenAt = body["takenAt"];

  if (!petId || typeof petId !== "string") {
    return c.json({ error: "petId is required" }, 400);
  }

  if (!file || !(file instanceof File)) {
    return c.json({ error: "file is required" }, 400);
  }

  // --- Validate file ---
  if (!(PET_PHOTO_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return c.json(
      { error: `Invalid file type. Allowed: ${PET_PHOTO_ALLOWED_TYPES.join(", ")}` },
      400
    );
  }

  if (file.size > PET_PHOTO_MAX_SIZE) {
    return c.json(
      { error: `File too large. Max size: ${PET_PHOTO_MAX_SIZE / 1024 / 1024}MB` },
      400
    );
  }

  // --- Verify pet exists and user is a member of its household ---
  const [pet] = await db.select().from(pets).where(eq(pets.id, petId));
  if (!pet) {
    return c.json({ error: "Pet not found" }, 404);
  }

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.householdId, pet.householdId), eq(members.userId, userId)));

  if (!membership) {
    return c.json({ error: "You are not a member of this pet's household" }, 403);
  }

  // --- Check photo limit ---
  const [{ value: photoCount }] = await db
    .select({ value: drizzleCount() })
    .from(petPhotos)
    .where(eq(petPhotos.petId, petId));

  if (photoCount >= PET_PHOTO_MAX_PER_PET) {
    return c.json(
      { error: `Maximum ${PET_PHOTO_MAX_PER_PET} photos per pet reached` },
      400
    );
  }

  // --- Create DB record first to get ID ---
  const [photo] = await db
    .insert(petPhotos)
    .values({
      householdId: pet.householdId,
      petId,
      url: "", // placeholder, updated after upload
      caption: typeof caption === "string" && caption ? caption : null,
      takenAt: typeof takenAt === "string" && takenAt ? new Date(takenAt) : null,
      uploadedBy: membership.id,
    })
    .returning();

  // --- Upload to Supabase Storage ---
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = await validateFileMagicBytes(buffer, PET_PHOTO_ALLOWED_TYPES);
    if (!detectedMime) {
      // Clean up the DB record since we're rejecting the file
      await db.delete(petPhotos).where(eq(petPhotos.id, photo.id));
      return c.json(
        { error: `File content does not match an allowed image type. Allowed: ${PET_PHOTO_ALLOWED_TYPES.join(", ")}` },
        400
      );
    }
    const url = await uploadPetPhoto(pet.householdId, petId, photo.id, buffer, detectedMime);

    // Update record with real URL
    const [updated] = await db
      .update(petPhotos)
      .set({ url })
      .where(eq(petPhotos.id, photo.id))
      .returning();

    return c.json({ photo: updated });
  } catch (err) {
    // Clean up the DB record if upload failed
    await db.delete(petPhotos).where(eq(petPhotos.id, photo.id));
    throw err;
  }
});

export default uploadApp;
