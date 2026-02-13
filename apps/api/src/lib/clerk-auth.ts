import { verifyToken } from "@clerk/backend";

/**
 * Verify a Clerk JWT from an Authorization header value.
 * Returns the userId (sub claim) or null if invalid/missing.
 */
export async function verifyClerkToken(
  authHeader: string | undefined
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, "\n");
    const payload = await verifyToken(token, {
      ...(jwtKey
        ? { jwtKey }
        : { secretKey: process.env.CLERK_SECRET_KEY! }),
    });
    return payload.sub;
  } catch {
    return null;
  }
}
