import { defineHandler } from "nitro";
import { sameOrigin, verifyAdministrator } from "@/lib/trading/access";

function envOf(request: Request) { return (request as any).runtime?.cloudflare?.env; }

export default defineHandler(async (event) => {
  const request = event.req;
  if (!await verifyAdministrator(request.headers.get("cf-access-jwt-assertion"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = envOf(request)?.DB;
  if (!db) return Response.json({ error: "database unavailable" }, { status: 503 });
  if (request.method === "GET") {
    const row = await db.prepare("SELECT enabled, model_endpoint, model_name, updated_at FROM trading_runtime WHERE id = 1").first();
    return Response.json({ runtime: row ? { ...row, enabled: row.enabled === 1 } : { enabled: false, modelEndpoint: null, modelName: null }, modelKeyConfigured: Boolean(envOf(request)?.MODEL_API_KEY), exchangeCredentialsConfigured: Boolean(envOf(request)?.BINANCE_API_KEY && envOf(request)?.BINANCE_API_SECRET), executionEnabled: false }, { headers: { "cache-control": "no-store" } });
  }
  if (request.method !== "PUT") return Response.json({ error: "method not allowed" }, { status: 405 });
  if (!sameOrigin(request) || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "invalid request origin or content type" }, { status: 403 });
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "invalid JSON" }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "invalid configuration" }, { status: 400 });
  const body = input as Record<string, unknown>;
  if (Object.keys(body).sort().join(",") !== "enabled,modelEndpoint,modelName" || typeof body.enabled !== "boolean" || typeof body.modelEndpoint !== "string" || typeof body.modelName !== "string" || body.modelName.length > 128) return Response.json({ error: "invalid configuration" }, { status: 400 });
  let endpoint: URL;
  try { endpoint = new URL(body.modelEndpoint); } catch { return Response.json({ error: "invalid model endpoint" }, { status: 400 }); }
  const allowedHosts = new Set(["api.openai.com", "api.deepseek.com", "api.siliconflow.cn", "openrouter.ai"]);
  if (endpoint.protocol !== "https:" || !allowedHosts.has(endpoint.hostname) || endpoint.username || endpoint.password || endpoint.port) return Response.json({ error: "model endpoint host is not allowed" }, { status: 400 });
  if (body.enabled && (!envOf(request)?.MODEL_API_KEY || !envOf(request)?.BINANCE_API_KEY || !envOf(request)?.BINANCE_API_SECRET)) return Response.json({ error: "model and Binance server secrets must be configured before enabling runtime" }, { status: 409 });
  await db.prepare("INSERT INTO trading_runtime (id, enabled, model_endpoint, model_name) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled, model_endpoint = excluded.model_endpoint, model_name = excluded.model_name, updated_at = CURRENT_TIMESTAMP").bind(body.enabled ? 1 : 0, endpoint.toString(), body.modelName.trim()).run();
  return Response.json({ ok: true, executionEnabled: false });
});
