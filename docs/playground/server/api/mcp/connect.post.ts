import { defineHandler } from "nitro";
import { sameOrigin, verifyAdministrator } from "@/lib/trading/access";
import { createAuthorization, hashState, seal } from "@/lib/trading/mcp-oauth";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion")) || !sameOrigin(request)) return Response.json({ error: "unauthorized" }, { status: 403 });
  const env = (request as any).runtime?.cloudflare?.env;
  if (!env?.DB || !env?.MCP_VAULT_KEY) return Response.json({ error: "MCP authorization is not configured" }, { status: 503 });
  try {
    const flow = await createAuthorization();
    const encrypted = await seal(env.MCP_VAULT_KEY, flow.verifier);
    await env.DB.prepare("DELETE FROM mcp_oauth_pending WHERE expires_at <= ?").bind(Date.now()).run();
    await env.DB.prepare("INSERT INTO mcp_oauth_pending (state_hash, verifier_encrypted, expires_at) VALUES (?, ?, ?)").bind(await hashState(flow.state), encrypted, Date.now() + 600000).run();
    return Response.json({ authorizationUrl: flow.url }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ error: "unable to start authorization" }, { status: 503 }); }
});
