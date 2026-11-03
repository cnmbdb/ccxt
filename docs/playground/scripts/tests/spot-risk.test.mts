import { test } from "node:test";
import assert from "node:assert/strict";
import { emptySpotRisk, validateSpotRisk } from "../../lib/spot-risk.ts";

test("risk settings require explicit limits, symbols and stop behavior", () => {
  assert.ok(validateSpotRisk(emptySpotRisk).length >= 5);
  const valid = { symbols: "BTC/USDT, ETH/USDT", maxOrder: "20", maxPosition: "100", maxDailyLoss: "10", cancelOnStop: false };
  assert.deepEqual(validateSpotRisk(valid), []);
  assert.ok(validateSpotRisk({ ...valid, maxOrder: "101" }).length);
  assert.ok(validateSpotRisk({ ...valid, maxDailyLoss: "Infinity" }).length);
  assert.ok(validateSpotRisk({ ...valid, symbols: "BTC/USDT, BTC/USDT" }).length);
  assert.ok(validateSpotRisk({ ...valid, symbols: "BTC/BUSD" }).length);
});
