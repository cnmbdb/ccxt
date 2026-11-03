import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

let base;
let server;
before(async () => {
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [".output/server/index.mjs"], {
    env: { ...process.env, PORT: String(port), PLAYGROUND_AI_URL: "" },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${base}/api/prompts`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Nitro server did not start");
});
after(() => server?.kill());

test("prompt samples and CCXT types are served", async () => {
  const prompts = await (await fetch(`${base}/api/prompts`)).json();
  assert.equal(prompts.prompts.length, 8);
  const types = await (await fetch(`${base}/api/ccxt-types`)).json();
  assert.ok(types.libs.length > 0);
});
test("run API validates input and streams execution output", async () => {
  const post = (body) => fetch(`${base}/api/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post({ language: "invalid", code: "x" })).status, 400);
  const response = await post({ language: "ts", code: "console.log(6 * 7)" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/x-ndjson/);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.ok(events.some((event) => event.type === "chunk" && event.data.includes("42")));
  assert.ok(events.some((event) => event.type === "end" && event.exitCode === 0));
});
test("AI API reports missing configuration", async () => {
  const response = await fetch(`${base}/api/ai`, { method: "POST" });
  assert.equal(response.status, 503);
});
