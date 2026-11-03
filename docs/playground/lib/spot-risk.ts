export type SpotRisk = {
  symbols: string;
  maxOrder: string;
  maxPosition: string;
  maxDailyLoss: string;
  cancelOnStop: boolean | null;
};

export const emptySpotRisk: SpotRisk = {
  symbols: "",
  maxOrder: "",
  maxPosition: "",
  maxDailyLoss: "",
  cancelOnStop: null,
};

export function validateSpotRisk(config: SpotRisk): string[] {
  const errors: string[] = [];
  const symbols = config.symbols.split(",").map((value) => value.trim());
  if (!symbols.length || symbols.some((value) => !/^[A-Z0-9]{2,20}\/USDT$/.test(value))) {
    errors.push("请输入以逗号分隔的现货 USDT 交易对，例如 BTC/USDT, ETH/USDT。");
  } else if (new Set(symbols).size !== symbols.length) {
    errors.push("交易对不能重复。");
  }
  for (const [label, value] of [["单笔上限", config.maxOrder], ["总持仓上限", config.maxPosition], ["每日亏损上限", config.maxDailyLoss]]) {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value) || !Number.isFinite(Number(value)) || Number(value) <= 0) {
      errors.push(`${label}必须是大于 0 的数值，最多 8 位小数。`);
    }
  }
  if (Number(config.maxOrder) > Number(config.maxPosition)) errors.push("单笔上限不能超过总持仓上限。");
  if (config.cancelOnStop === null) errors.push("请选择停机时是否撤销未成交订单。");
  return errors;
}
