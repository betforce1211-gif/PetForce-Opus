import crypto from "crypto";

// Letters excluding I and O to avoid confusion with 1 and 0
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateJoinCode(): string {
  const bytes = crypto.randomBytes(7);
  let code = "";
  for (let i = 0; i < 3; i++) {
    code += LETTERS[bytes[i] % LETTERS.length];
  }
  code += "-";
  for (let i = 3; i < 7; i++) {
    code += (bytes[i] % 10).toString();
  }
  return code;
}

export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
