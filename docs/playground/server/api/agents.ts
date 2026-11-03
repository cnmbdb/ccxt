import { defineHandler } from "nitro";
import { sameOrigin, verifyAdministrator } from "@/lib/trading/access";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.method !== "GET" && !sameOrigin(request)) return Response.json({ error: "invalid origin" }, { status: 403 });
  const db = (event as any).req?.runtime?.cloudflare?.env?.DB;
  if (!db) return Response.json({ agents: [], persistence: "unavailable" });
  if (event.req.method === "GET") {
    const result = await db.prepare("SELECT * FROM agents ORDER BY updated_at DESC").all();
    return Response.json({ agents: result.results ?? [], persistence: "d1" });
  }
  if (event.req.method !== "POST") return Response.json({ error: "method not allowed" }, { status: 405 });
  const body = await event.req.json() as { id?: string; name?: string; model?: string; skills?: string[] };
  if (!body.id || !body.name || !body.model) return Response.json({ error: "id, name and model are required" }, { status: 400 });
  await db.prepare("INSERT INTO agents (id,name,model,skills_json) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,model=excluded.model,skills_json=excluded.skills_json,updated_at=CURRENT_TIMESTAMP").bind(body.id, body.name, body.model, JSON.stringify(body.skills ?? [])).run();
  return Response.json({ ok: true, id: body.id }, { status: 201 });
});
