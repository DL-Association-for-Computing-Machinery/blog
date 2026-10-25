import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, detectImage } from "../src/security.js";
test("passwords are salted and cannot be verified with another password", async () => {
  const first = await hashPassword("a long password");
  const second = await hashPassword("a long password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("a long password", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("a long password", "broken"), false);
});
test("uploads identify binary signatures and reject executable SVG / spoofed text", () => {
  assert.equal(detectImage(Buffer.from('<svg onload="alert(1)"></svg>')), null);
  assert.equal(detectImage(Buffer.from("not a PNG file")), null);
  assert.equal(
    detectImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])),
    "image/png",
  );
});
