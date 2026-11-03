import { defineHandler } from "nitro";
import { validateSpotRisk, type SpotRisk } from "@/lib/spot-risk";
import { sameOrigin, verifyAdministrator } from "@/lib/trading/access";

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = (request as any).runtime?.cloudflare?.env?.DB;
  if (!db) return Response.json({ error: "database unavailable" }, { status: 503 });
  if (request.method === "GET") {
    const row = await db.prepare("SELECT config_json, updated_at FROM spot_risk_config WHERE id = 1").first();
    return Response.json({ config: row ? JSON.parse(row.config_json) : null, updatedAt: row?.updated_at ?? null, executionEnabled: false }, { headers: { "cache-control": "no-store" } });
  }
  if (request.method !== "PUT") return Response.json({ error: "method not allowed" }, { status: 405 });
  if (!sameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "invalid request origin or content type" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4096) return Response.json({ error: "request too large" }, { status: 413 });
  let input: unknown;
  try { const text = await request.text(); if (text.length > 4096) return Response.json({ error: "request too large" }, { status: 413 }); input = JSON.parse(text); } catch { return Response.json({ error: "invalid JSON" }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "invalid configuration" }, { status: 400 });
  const data = input as Record<string, unknown>;
  if (Object.keys(data).sort().join(",") !== "cancelOnStop,maxDailyLoss,maxOrder,maxPosition,symbols" || typeof data.symbols !== "string" || typeof data.maxOrder !== "string" || typeof data.maxPosition !== "string" || typeof data.maxDailyLoss !== "string" || typeof data.cancelOnStop !== "boolean") return Response.json({ error: "invalid configuration" }, { status: 400 });
  const config = data as SpotRisk;
  const errors = validateSpotRisk(config);
  if (errors.length) return Response.json({ errors }, { status: 400 });
  await db.prepare("INSERT INTO spot_risk_config (id, config_json, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json, updated_at = CURRENT_TIMESTAMP").bind(JSON.stringify(config)).run();
  return Response.json({ ok: true, executionEnabled: false });
});
