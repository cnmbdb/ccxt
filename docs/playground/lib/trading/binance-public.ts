const BASE = "https://data-api.binance.vision";
export type MarketSnapshot = { symbol: string; price: string; timestamp: number };

/** Public Binance Spot market data only. Never accepts an arbitrary host or a trading credential. */
export async function fetchSpotPrice(symbol: string, fetcher: typeof fetch = fetch): Promise<MarketSnapshot | null> {
  if (!/^[A-Z0-9]{2,20}\/USDT$/.test(symbol)) return null;
  const market = symbol.replace("/", "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher(`${BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(market)}`, { signal: controller.signal });
    if (!response.ok || Number(response.headers.get("content-length") || 0) > 2048) return null;
    const text = await response.text();
    if (text.length > 2048) return null;
    const body = JSON.parse(text);
    if (body?.symbol !== market || typeof body.price !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(body.price) || Number(body.price) <= 0) return null;
    return { symbol, price: body.price, timestamp: Date.now() };
  } catch { return null; } finally { clearTimeout(timer); }
}
