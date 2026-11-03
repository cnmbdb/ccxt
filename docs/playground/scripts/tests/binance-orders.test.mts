import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupOrder, submitMarketOrder } from "../../lib/trading/binance-orders.ts";

const credentials = { apiKey: "mock", secret: "mock", environment: "testnet" as const };
test("order submission signs one request and never retries an ambiguous timeout", async () => {
  let calls = 0;
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://testnet.binance.vision");
    assert.equal(url.searchParams.get("newClientOrderId"), "order-1");
    assert.match(url.searchParams.get("signature") || "", /^[0-9a-f]{64}$/);
    assert.equal(init?.method, "POST");
    return Response.json({ code: -1007 }, { status: 504 });
  };
  assert.deepEqual(await submitMarketOrder(credentials, "BTCUSDT", "BUY", "20", "order-1", fetcher), { status: "unknown" });
  assert.equal(calls, 1);
});
test("reconciliation requires matching symbol and client order id", async () => {
  const found = async () => Response.json({ symbol: "BTCUSDT", clientOrderId: "order-1", orderId: 1, status: "FILLED" });
  assert.equal((await lookupOrder(credentials, "BTCUSDT", "order-1", found)).status, "found");
  assert.equal((await lookupOrder(credentials, "BTCUSDT", "order-2", found)).status, "unknown");
  assert.equal((await lookupOrder(credentials, "BTCUSDT", "order-1", async () => Response.json({ code: -2013 }, { status: 400 }))).status, "unknown");
});
