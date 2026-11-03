import test from "node:test";
import assert from "node:assert/strict";
import { runScheduler } from "../../workers/trading-scheduler/src/index.ts";

function database(runtimeEnabled = 0) {
  const runs = new Set<string>();
  const executed: string[] = [];
  const db = {
    prepare(query: string) {
      let values: unknown[] = [];
      return {
        bind(...args: unknown[]) { values = args; return this; },
        async first() { return { enabled: runtimeEnabled }; },
        async all() { return { results: [{ id: "strategy-1" }] }; },
        async run() {
          executed.push(query);
          if (query.includes("INSERT OR IGNORE INTO trading_runs")) {
            const key = `${values[1]}:${values[2]}`;
            if (runs.has(key)) return { meta: { changes: 0 } };
            runs.add(key);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 1 } };
        },
      };
    },
  };
  return { db, runs, executed };
}

test("scheduled runs are idempotent within a five-minute bucket and never submit orders", async () => {
  const { db, runs, executed } = database();
  const first = await runScheduler(db as never, 1_800_000);
  const second = await runScheduler(db as never, 1_810_000);
  assert.deepEqual(first, { created: 1, strategies: 1 });
  assert.deepEqual(second, { created: 0, strategies: 1 });
  assert.equal(runs.size, 1);
  assert.equal(executed.some((query) => /INSERT INTO spot_orders|api\/v3\/order/.test(query)), false);
});

test("runtime enablement is not treated as sufficient execution authorization", async () => {
  const { db } = database(1);
  assert.deepEqual(await runScheduler(db as never, 1_800_000), { created: 1, strategies: 1 });
});
