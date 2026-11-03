import { defineHandler } from "nitro";
import { verifyAdministrator } from "@/lib/trading/access";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return new Response("Unauthorized", { status: 401 });
  return new Response("This website is not a Binance-supported MCP client. Connect using a supported Agent application.", { status: 410, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
});
