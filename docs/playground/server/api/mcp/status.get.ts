import { defineHandler } from "nitro";
import { verifyAdministrator } from "@/lib/trading/access";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ supported: false, connected: false, reason: "unsupported_mcp_client", message: "Connect from a Binance-supported MCP Agent client." }, { headers: { "cache-control": "no-store" } });
});
