import { strict as assert } from "node:assert";
import { test } from "node:test";
import { encrypt, decrypt } from "../crypto";

// crypto derives its key from AUTH_SECRET; ensure one is set for the test run.
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-crypto-tests-only-32chars";

test("encrypt/decrypt round-trips a credential string", () => {
  const original = "ya29.test-oauth-refresh-token-12345";
  const ciphertext = encrypt(original);
  assert.notEqual(ciphertext, original, "ciphertext must not equal plaintext");
  assert.equal(decrypt(ciphertext), original);
});

test("ciphertext format contains iv.tag.data", () => {
  const ciphertext = encrypt("secret");
  const parts = ciphertext.split(".");
  assert.equal(parts.length, 3, "expected iv.tag.payload");
});

test("decrypt rejects tampered ciphertext", () => {
  const ciphertext = encrypt("secret");
  const [, tag, payload] = ciphertext.split(".");
  // flip a byte in the payload
  const tampered = `AAAA.${tag}.${payload}`;
  assert.throws(() => decrypt(tampered));
});

test("different encryptions of the same value differ (random IV)", () => {
  const a = encrypt("same-value");
  const b = encrypt("same-value");
  assert.notEqual(a, b, "IV must be random so ciphertexts differ");
  assert.equal(decrypt(a), decrypt(b));
});
