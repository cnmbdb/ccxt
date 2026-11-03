import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyAdministrator, sameOrigin } from "../../lib/trading/access.ts";

test("only a valid signed Access assertion for the configured admin is accepted", async () => {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "test-key", alg: "RS256" };
  const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Date.now();
  const claims = { iss: "https://hfzstore.cloudflareaccess.com", aud: ["f3b8a3eac994052664188370bb94c46edb87c330837928e1109ddf63e77275a0"], email: "1733206793a@gmail.com", iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 60 };
  async function sign(body: object) {
    const value = `${encoded({ alg: "RS256", kid: "test-key" })}.${encoded(body)}`;
    return `${value}.${Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(value))).toString("base64url")}`;
  }
  const fetcher = async () => Response.json({ keys: [jwk] });
  assert.equal(await verifyAdministrator(await sign(claims), fetcher, now), true);
  assert.equal(await verifyAdministrator(await sign({ ...claims, email: "other@example.com" }), fetcher, now), false);
  assert.equal(await verifyAdministrator(await sign({ ...claims, exp: Math.floor(now / 1000) - 1 }), fetcher, now), false);
  const valid = await sign(claims);
  assert.equal(await verifyAdministrator(valid.slice(0, -8) + "abcdefgh", fetcher, now), false);
  assert.equal(await verifyAdministrator(valid, async () => Response.json({ keys: [] }), now), false);
});

test("writes require a matching request origin", () => {
  assert.equal(sameOrigin(new Request("https://example.com/api", { headers: { origin: "https://example.com" } })), true);
  assert.equal(sameOrigin(new Request("https://example.com/api", { headers: { origin: "https://evil.example" } })), false);
  assert.equal(sameOrigin(new Request("https://example.com/api")), false);
});
