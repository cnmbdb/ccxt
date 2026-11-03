import { defineHandler } from "nitro";
import { PROMPTS } from "@/lib/prompts";


const SAMPLE = 8;

// Sampled server-side so the full prompt list never ships in the client bundle.
// `?exclude=` carries the prompts currently on screen (the previous sample), so a
// refresh always deals a fresh hand instead of re-dealing visible ones. Exclusion
// is capped so it can never starve the pool below a full sample.
export default defineHandler(async (event) => {
  const req = event.req;
  const excluded = new Set(
    (new URL(req.url).searchParams.getAll("exclude") ?? []).slice(0, PROMPTS.length - SAMPLE),
  );
  const pool = PROMPTS.map((_, i) => i).filter((i) => !excluded.has(PROMPTS[i]));
  const take = Math.min(SAMPLE, pool.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const prompts = pool.slice(0, take).map((i) => PROMPTS[i]);
  return Response.json({ prompts }, { headers: { "Cache-Control": "no-store" } });
});
