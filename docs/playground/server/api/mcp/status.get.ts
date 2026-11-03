import { defineHandler } from "nitro";
import { verifyAdministrator } from "@/lib/trading/access";
import { discoverMcpAuthorization } from "@/lib/trading/binance-mcp";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const env = (request as any).runtime?.cloudflare?.env;
  if (!env?.DB || !env?.MCP_VAULT_KEY) return Response.json({ configured: false, connected: false, error: "oauth_not_configured" }, { headers: { "cache-control": "no-store" } });
  const row = await env.DB.prepare("SELECT updated_at FROM mcp_oauth_token WHERE id = 1").first();
  const challenge = await discoverMcpAuthorization();
  return Response.json({ configured: Boolean(challenge?.authorizationRequired), connected: Boolean(row), connectedAt: row?.updated_at ?? null }, { headers: { "cache-control": "no-store" } });
});
