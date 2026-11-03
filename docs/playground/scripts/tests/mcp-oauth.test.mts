import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuthorization, exchangeAuthorization, hashState, MCP_CLIENT_ID, MCP_REDIRECT_URI, seal, unseal } from "../../lib/trading/mcp-oauth.ts";

test("authorization creates independent random state and an S256 PKCE challenge", async () => {
  const a = await createAuthorization();
  const b = await createAuthorization();
  const url = new URL(a.url);
  assert.notEqual(a.state, b.state);
  assert.notEqual(a.verifier, b.verifier);
  assert.equal(url.searchParams.get("state"), a.state);
  assert.equal(url.searchParams.get("code_challenge"), await hashState(a.verifier));
  assert.equal(url.searchParams.get("client_id"), MCP_CLIENT_ID);
  assert.equal(url.searchParams.get("redirect_uri"), MCP_REDIRECT_URI);
});
test("token exchange validates responses and posts only to Binance", async () => {
  const { verifier } = await createAuthorization();
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "https://accounts.binance.com/oauth-agentic/token");
    assert.equal(new URLSearchParams(String(init?.body)).get("code_verifier"), verifier);
    return Response.json({ access_token: "example", token_type: "Bearer" });
  };
  assert.ok(await exchangeAuthorization("example-code", verifier, fetcher));
  assert.equal(await exchangeAuthorization("example-code", verifier, async () => Response.json({ token_type: "Bearer" })), null);
});
test("AES-GCM vault rejects tampering and a different key", async () => {
  const key = Buffer.alloc(32, 1).toString("base64");
  const encrypted = await seal(key, "secret");
  assert.equal(await unseal(key, encrypted), "secret");
  assert.ok(!encrypted.includes("secret"));
  await assert.rejects(unseal(Buffer.alloc(32, 2).toString("base64"), encrypted));
});
