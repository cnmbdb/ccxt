import { test } from "node:test";
import assert from "node:assert/strict";
import { nextReconciliationAction, transitionOrder } from "../../lib/trading/order-state.ts";

test("ambiguous submissions reconcile by client id and terminal states do not reopen", () => {
  assert.equal(nextReconciliationAction("planned"), "submit");
  assert.equal(nextReconciliationAction("unknown"), "lookup");
  assert.equal(nextReconciliationAction("partially_filled"), "lookup");
  assert.equal(nextReconciliationAction("filled"), "none");
  assert.equal(transitionOrder("unknown", "filled"), "filled");
  assert.throws(() => transitionOrder("filled", "accepted"));
  assert.throws(() => transitionOrder("partially_filled", "unknown"));
});
