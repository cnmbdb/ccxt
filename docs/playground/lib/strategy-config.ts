export type StrategyKind = "grid" | "ema" | "dca" | "agent";
export const capabilityOptions = [
  { id: "market.read", name: "行情读取", description: "读取交易对价格与 K 线" },
  {
    id: "indicators.calculate",
    name: "技术指标",
    description: "计算均线、RSI 等指标",
  },
  {
    id: "portfolio.read",
    name: "账户读取",
    description: "读取余额、仓位与未成交订单",
  },
  {
    id: "signal.propose",
    name: "信号建议",
    description: "输出 buy / sell / hold 结构化建议",
  },
] as const;
export const kindNames: Record<StrategyKind, string> = {
  grid: "现货网格",
  ema: "双均线趋势",
  dca: "定时定额",
  agent: "Agent 策略",
};
export type AgentSkill = {
  id: string;
  name: string;
  instructions: string;
  enabled: boolean;
};
export type StrategyConfig = {
  version: 1;
  id: string;
  name: string;
  description: string;
  kind: StrategyKind;
  pair: string;
  timeframe: string;
  maxOrder: number;
  stopLoss: number;
  parameters: {
    lower: number;
    upper: number;
    grids: number;
    fast: number;
    slow: number;
    amount: number;
    interval: number;
  };
  agent: {
    enabled: boolean;
    model: string;
    instructions: string;
    capabilities: string[];
    skills: AgentSkill[];
    confidence: number;
    timeout: number;
  };
};
export const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
export const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
export function createStrategy(kind: StrategyKind, id: string): StrategyConfig {
  return {
    version: 1,
    id,
    name: kindNames[kind],
    description: "",
    kind,
    pair: "BTC/USDT",
    timeframe: "15m",
    maxOrder: 25,
    stopLoss: 3,
    parameters: {
      lower: 55000,
      upper: 75000,
      grids: 10,
      fast: 12,
      slow: 26,
      amount: 20,
      interval: 60,
    },
    agent: {
      enabled: kind === "agent",
      model: "",
      instructions:
        "根据市场数据分析趋势、波动与风险。数据不足或信号冲突时输出 hold；以 JSON 返回 action、symbol、confidence 和 reason。",
      capabilities: ["market.read", "indicators.calculate", "signal.propose"],
      skills: [],
      confidence: 0.75,
      timeout: 30,
    },
  };
}
export const starterStrategies: StrategyConfig[] = [
  createStrategy("grid", "grid-default"),
  createStrategy("ema", "ema-default"),
  createStrategy("dca", "dca-default"),
];
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function validateStrategy(value: unknown): string[] {
  if (!record(value)) return ["策略配置格式无效"];
  const errors: string[] = [];
  if (value.version !== 1 || typeof value.id !== "string" || !value.id)
    errors.push("策略版本或标识无效");
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 40
  )
    errors.push("请输入 1–40 字的策略名称");
  if (typeof value.description !== "string" || value.description.length > 300)
    errors.push("描述最多 300 字");
  if (!(typeof value.kind === "string" && Object.hasOwn(kindNames, value.kind)))
    errors.push("策略类型无效");
  if (
    !pairs.includes(String(value.pair)) ||
    !timeframes.includes(String(value.timeframe))
  )
    errors.push("请选择有效的交易对和周期");
  if (!number(value.maxOrder, 1, 1000000))
    errors.push("单笔金额上限须为 1–1,000,000 USDT");
  if (!number(value.stopLoss, 0.1, 100)) errors.push("止损比例须为 0.1–100%");
  const p = value.parameters;
  if (!record(p)) errors.push("策略参数格式无效");
  else {
    if (
      ["lower", "upper", "grids", "fast", "slow", "amount", "interval"].some(
        (key) => typeof p[key] !== "number" || !Number.isFinite(p[key]),
      )
    )
      errors.push("策略参数包含无效数值");
    if (
      value.kind === "grid" &&
      (!number(p.lower, 0.000001, 100000000) ||
        !number(p.upper, 0.000001, 100000000) ||
        Number(p.upper) <= Number(p.lower) ||
        !Number.isInteger(p.grids) ||
        !number(p.grids, 2, 200))
    )
      errors.push("网格价格上限必须大于下限，网格数量须为 2–200 的整数");
    if (
      value.kind === "ema" &&
      (!Number.isInteger(p.fast) ||
        !Number.isInteger(p.slow) ||
        !number(p.fast, 2, 499) ||
        !number(p.slow, 3, 500) ||
        Number(p.fast) >= Number(p.slow))
    )
      errors.push("均线周期须为整数，快线必须短于慢线（2–500）");
    if (
      value.kind === "dca" &&
      (!number(p.amount, 1, Number(value.maxOrder)) ||
        !Number.isInteger(p.interval) ||
        !number(p.interval, 1, 43200))
    )
      errors.push("定投金额不能超过单笔上限，间隔须为 1–43,200 分钟的整数");
  }
  const a = value.agent;
  if (
    !record(a) ||
    typeof a.enabled !== "boolean" ||
    typeof a.model !== "string" ||
    typeof a.instructions !== "string" ||
    !Array.isArray(a.capabilities) ||
    a.capabilities.some((c) => !capabilityOptions.some((o) => o.id === c)) ||
    new Set(a.capabilities).size !== a.capabilities.length ||
    !Array.isArray(a.skills)
  )
    return [...errors, "Agent 配置格式或能力范围无效"];
  if (
    !number(a.confidence, 0, 1) ||
    !Number.isInteger(a.timeout) ||
    !number(a.timeout, 5, 120)
  )
    errors.push("Agent 置信度须为 0–1，超时须为 5–120 秒的整数");
  if (value.kind === "agent" && !a.enabled)
    errors.push("Agent 策略必须启用 Agent 能力");
  if (
    a.enabled &&
    (!a.model.trim() ||
      a.model.length > 100 ||
      !a.instructions.trim() ||
      a.instructions.length > 6000 ||
      !a.capabilities.includes("signal.propose"))
  )
    errors.push("启用 Agent 后请填写模型、分析指令并保留信号建议能力");
  if (
    a.skills.length > 12 ||
    a.skills.some(
      (s) =>
        !record(s) ||
        typeof s.id !== "string" ||
        !s.id ||
        typeof s.name !== "string" ||
        !s.name.trim() ||
        s.name.length > 40 ||
        typeof s.instructions !== "string" ||
        !s.instructions.trim() ||
        s.instructions.length > 2000 ||
        typeof s.enabled !== "boolean",
    ) ||
    new Set(a.skills.map((s) => (record(s) ? s.id : null))).size !==
      a.skills.length
  )
    errors.push("能力项名称、指令均为必填，最多添加 12 项");
  return errors;
}
export function validateCollection(
  values: unknown,
): values is StrategyConfig[] {
  return (
    Array.isArray(values) &&
    values.every((v) => validateStrategy(v).length === 0) &&
    new Set(values.map((v) => v.id)).size === values.length &&
    new Set(values.map((v) => v.name.trim().toLowerCase())).size ===
      values.length
  );
}
