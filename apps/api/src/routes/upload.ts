import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db, pets, members } from "@petforce/db";
import { PET_AVATAR_MAX_SIZE, PET_AVATAR_ALLOWED_TYPES } from "@petforce/core";
import { verifyClerkToken } from "../lib/clerk-auth";
import { uploadPetAvatar } from "../lib/supabase-storage";

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

  // --- Upload to Supabase Storage ---
  const buffer = Buffer.from(await file.arrayBuffer());
  const avatarUrl = await uploadPetAvatar(pet.householdId, petId, buffer, file.type);

  // --- Update pet record ---
  await db
    .update(pets)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(pets.id, petId));

  return c.json({ avatarUrl });
});

export default uploadApp;
