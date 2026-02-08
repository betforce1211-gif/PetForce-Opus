import crypto from "crypto";

// Letters excluding I and O to avoid confusion with 1 and 0
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < 3; i++) {
    code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
