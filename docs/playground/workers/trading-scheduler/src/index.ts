interface D1Result { results?: Record<string, unknown>[]; meta?: { changes?: number } }
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all(): Promise<D1Result>;
  first(): Promise<Record<string, unknown> | null>;
  run(): Promise<D1Result>;
}
interface D1Database {
  prepare(query: string): D1Statement;
}
interface Env { DB: D1Database }
interface ScheduledEventLike { scheduledTime: number }
interface ExecutionContextLike { waitUntil(promise: Promise<unknown>): void }

export async function runScheduler(db: D1Database, scheduledTime: number): Promise<{ created: number; strategies: number }> {
  const bucket = new Date(Math.floor(scheduledTime / 300000) * 300000).toISOString();
  const runtime = await db.prepare("SELECT enabled FROM trading_runtime WHERE id = 1").first();
  const strategies = await db.prepare("SELECT id FROM strategies WHERE enabled = 1").bind().all();
  let created = 0;
  for (const strategy of strategies.results ?? []) {
    const id = crypto.randomUUID();
    const reason = runtime?.enabled === 1 ? "execution_prerequisites_not_verified" : "runtime_disabled";
    const result = await db.prepare("INSERT OR IGNORE INTO trading_runs (id, strategy_id, scheduled_for, status, reason) VALUES (?, ?, ?, 'blocked', ?)").bind(id, strategy.id, bucket, reason).run();
    if ((result.meta?.changes ?? 0) > 0) {
      created++;
      await db.prepare("INSERT INTO trade_audit (id, agent_id, action, payload_json, risk_decision) SELECT ?, agent_id, 'scheduled_run_blocked', ?, ? FROM strategies WHERE id = ?").bind(crypto.randomUUID(), JSON.stringify({ runId: id, scheduledFor: bucket }), reason, strategy.id).run();
    }
  }
  return { created, strategies: strategies.results?.length ?? 0 };
}

export default {
  async scheduled(event: ScheduledEventLike, env: Env, ctx: ExecutionContextLike) {
    ctx.waitUntil(runScheduler(env.DB, event.scheduledTime));
  },
};
