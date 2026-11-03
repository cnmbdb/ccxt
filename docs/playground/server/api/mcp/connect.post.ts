import { defineHandler } from "nitro";
import { sameOrigin, verifyAdministrator } from "@/lib/trading/access";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion")) || !sameOrigin(request)) return Response.json({ error: "unauthorized" }, { status: 403 });
  return Response.json({ error: "unsupported_mcp_client", message: "Binance MCP OAuth must be started from a Binance-supported Agent client. This custom website is not currently supported." }, { status: 409, headers: { "cache-control": "no-store" } });
});
