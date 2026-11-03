import { defineHandler } from "nitro";
import { verifyAdministrator } from "@/lib/trading/access";
import { exchangeAuthorization, hashState, seal, unseal } from "@/lib/trading/mcp-oauth";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return new Response("Unauthorized", { status: 401 });
  const env = (request as any).runtime?.cloudflare?.env;
  if (!env?.DB || !env?.MCP_VAULT_KEY) return new Response("Authorization unavailable", { status: 503 });
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !code) return new Response("Invalid authorization response", { status: 400 });
  try {
    const pending = await env.DB.prepare("DELETE FROM mcp_oauth_pending WHERE state_hash = ? AND expires_at > ? RETURNING verifier_encrypted").bind(await hashState(state), Date.now()).first();
    if (!pending) return new Response("Authorization expired or already used", { status: 400 });
    const tokens = await exchangeAuthorization(code, await unseal(env.MCP_VAULT_KEY, pending.verifier_encrypted));
    if (!tokens) return new Response("Authorization failed; please reconnect", { status: 502 });
    const encrypted = await seal(env.MCP_VAULT_KEY, JSON.stringify(tokens));
    await env.DB.prepare("INSERT INTO mcp_oauth_token (id, token_encrypted, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET token_encrypted = excluded.token_encrypted, updated_at = excluded.updated_at").bind(encrypted, Date.now()).run();
    return new Response(null, { status: 303, headers: { location: "/?mcp=connected", "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  } catch { return new Response("Authorization failed; please reconnect", { status: 503 }); }
});
