import { defineHandler } from "nitro";
export default defineHandler(async (event) => {
  const env = (event as any).req?.runtime?.cloudflare?.env;
  let database = "unavailable";
  let agents = 0;
  if (env?.DB) {
    const result = await env.DB.prepare("SELECT COUNT(*) AS count FROM agents").first();
    agents = Number(result?.count ?? 0);
    database = "d1";
  }
  return Response.json({ service: "Binance-Agent-botos", status: "ok", database, agents, timestamp: new Date().toISOString() });
});
