import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Encryption helper for integration credentials (OAuth tokens, API keys).
 * Uses AES-256-GCM with a key derived from AUTH_SECRET via scrypt.
 * Tokens never leave the server in plaintext and are never exposed to the browser.
 */

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT = "marketincrew-seo-credential-salt";

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET must be set to a long random string (>= 16 chars).",
    );
  }
  return scryptSync(secret, SALT, KEY_LEN);
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv) + "." + base64(tag) + "." + base64(ciphertext)
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid ciphertext payload");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
