/** Pure, fail-closed order gate. Values are USDT decimal strings, never floating point. */
export interface RiskLimits {
  symbols: string[];
  maxOrder: string;
  maxPosition: string;
  maxDailyLoss: string;
  cancelOnStop: boolean;
}

export interface RiskSnapshot {
  symbol: string;
  side: "buy" | "sell";
  orderValue: string;
  positionValue: string;
  dailyLoss: string;
  marketTimestamp: number;
  now: number;
  stopped: boolean;
  pendingOrder: boolean;
}

const decimalPattern = /^(?:0|[1-9]\d{0,17})(?:\.\d{1,8})?$/;
function units(value: unknown): bigint | null {
  if (typeof value !== "string" || !decimalPattern.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100000000n + BigInt((fraction + "00000000").slice(0, 8));
}

export function evaluateRisk(limits: RiskLimits, state: RiskSnapshot): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const orderLimit = units(limits.maxOrder);
  const positionLimit = units(limits.maxPosition);
  const lossLimit = units(limits.maxDailyLoss);
  const order = units(state.orderValue);
  const position = units(state.positionValue);
  const loss = units(state.dailyLoss);
  if (!Array.isArray(limits.symbols) || limits.symbols.length === 0 || limits.symbols.some((symbol) => typeof symbol !== "string" || !/^[A-Z0-9]{2,20}\/USDT$/.test(symbol)) || !limits.symbols.includes(state.symbol)) reasons.push("symbol_not_allowed");
  if (state.side !== "buy" && state.side !== "sell") reasons.push("invalid_side");
  if (typeof limits.cancelOnStop !== "boolean") reasons.push("stop_action_not_configured");
  if (orderLimit === null || positionLimit === null || lossLimit === null || orderLimit <= 0n || positionLimit <= 0n || lossLimit <= 0n) reasons.push("invalid_limits");
  if (order === null || position === null || loss === null || order <= 0n) reasons.push("invalid_snapshot");
  if (!Number.isSafeInteger(state.now) || !Number.isSafeInteger(state.marketTimestamp) || state.marketTimestamp > state.now || state.now - state.marketTimestamp > 30000) reasons.push("stale_market");
  if (state.stopped !== false) reasons.push("stopped");
  if (state.pendingOrder !== false) reasons.push("pending_order");
  if (order !== null && orderLimit !== null && order > orderLimit) reasons.push("order_limit");
  if (state.side === "buy" && order !== null && position !== null && positionLimit !== null && order + position > positionLimit) reasons.push("position_limit");
  if (loss !== null && lossLimit !== null && loss >= lossLimit) reasons.push("daily_loss_limit");
  return { allowed: reasons.length === 0, reasons };
}
