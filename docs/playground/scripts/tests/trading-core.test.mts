import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRisk } from "../../lib/trading/risk.ts";
import { parseSignal, requestSignal } from "../../lib/trading/model.ts";
import { fetchSpotPrice } from "../../lib/trading/binance-public.ts";
import { discoverMcpAuthorization } from "../../lib/trading/binance-mcp.ts";

const limits = { symbols: ["BTC/USDT"], maxOrder: "20", maxPosition: "100", maxDailyLoss: "10", cancelOnStop: true };
const state = { symbol: "BTC/USDT", side: "buy" as const, orderValue: "20", positionValue: "80", dailyLoss: "9.99999999", marketTimestamp: 100000, now: 100001, stopped: false, pendingOrder: false };
test("risk gate enforces exact decimal limits and fails closed", () => {
  assert.equal(evaluateRisk(limits, state).allowed, true);
  for (const change of [{ orderValue: "20.00000001" }, { positionValue: "80.00000001" }, { dailyLoss: "10" }, { marketTimestamp: 1 }, { stopped: true }, { pendingOrder: true }, { orderValue: "NaN" }, { symbol: "ETH/USDT" }]) {
    assert.equal(evaluateRisk(limits, { ...state, ...change }).allowed, false);
  }
});
test("Binance public price validates symbol and response", async () => {
  const fake = async (input: string | URL | Request) => {
    assert.match(String(input), /^https:\/\/data-api\.binance\.vision\/api\/v3\/ticker\/price\?symbol=BTCUSDT$/);
    return Response.json({ symbol: "BTCUSDT", price: "123.45000000" });
  };
  assert.equal((await fetchSpotPrice("BTC/USDT", fake))?.price, "123.45000000");
  assert.equal(await fetchSpotPrice("BTC/USDC", fake), null);
  assert.equal(await fetchSpotPrice("BTC/USDT", async () => Response.json({ symbol: "ETHUSDT", price: "1" })), null);
});
test("MCP discovery rejects untrusted OAuth challenges", async () => {
  const response = (url: string) => async () => new Response(null, { status: 401, headers: { "www-authenticate": `Bearer resource_metadata="${url}"` } });
  assert.ok(await discoverMcpAuthorization(response("https://agent.binance.com/.well-known/oauth-protected-resource/gateway-mcp")));
  assert.equal(await discoverMcpAuthorization(response("https://evil.example/.well-known/oauth-protected-resource/gateway-mcp")), null);
});
test("model results are constrained and malformed responses fail closed", async () => {
  assert.equal(parseSignal({ action: "buy", symbol: "BTC/USDT", confidence: 0.8, reason: "trend", amount: 10 }, "BTC/USDT"), null);
  assert.equal(parseSignal({ action: "buy", symbol: "ETH/USDT", confidence: 0.8, reason: "trend" }, "BTC/USDT"), null);
  const fetcher = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ action: "hold", symbol: "BTC/USDT", confidence: 0.6, reason: "uncertain" }) } }] });
  assert.equal((await requestSignal({ endpoint: "https://example.com", apiKey: "test", model: "test" }, "BTC/USDT", {}, fetcher))?.action, "hold");
  assert.equal(await requestSignal({ endpoint: "http://example.com", apiKey: "test", model: "test" }, "BTC/USDT", {}, fetcher), null);
});
