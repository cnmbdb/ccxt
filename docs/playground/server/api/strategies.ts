import { defineHandler } from "nitro";
import { sameOrigin, verifyAdministrator } from "@/lib/trading/access";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.method !== "GET" && !sameOrigin(request)) return Response.json({ error: "invalid origin" }, { status: 403 });
  const db = (event as any).req?.runtime?.cloudflare?.env?.DB;
  if (!db) return Response.json({ strategies: [], persistence: "unavailable" });
  if (event.req.method === "GET") {
    const result = await db.prepare("SELECT * FROM strategies ORDER BY updated_at DESC").all();
    return Response.json({ strategies: result.results ?? [], persistence: "d1" });
  }
  if (event.req.method !== "POST") return Response.json({ error: "method not allowed" }, { status: 405 });
  const body = await event.req.json() as { id?: string; agentId?: string; name?: string; market?: string; config?: unknown };
  if (!body.id || !body.agentId || !body.name || !body.market) return Response.json({ error: "id, agentId, name and market are required" }, { status: 400 });
  await db.prepare("INSERT INTO strategies (id,agent_id,name,market,config_json) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,market=excluded.market,config_json=excluded.config_json,updated_at=CURRENT_TIMESTAMP").bind(body.id, body.agentId, body.name, body.market, JSON.stringify(body.config ?? {})).run();
  return Response.json({ ok: true, id: body.id }, { status: 201 });
});
