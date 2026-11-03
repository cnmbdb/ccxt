type Credentials = { apiKey: string; secret: string; environment: "testnet" | "live" };
export type OrderLookup = { status: "found"; order: Record<string, unknown> } | { status: "unknown" };
export type OrderSubmission = { status: "accepted"; order: Record<string, unknown> } | { status: "rejected"; code: number } | { status: "unknown" };
const host = (environment: Credentials["environment"]) => environment === "testnet" ? "https://testnet.binance.vision" : "https://api.binance.com";

async function signedRequest(credentials: Credentials, method: "GET" | "POST", fields: Record<string, string>, fetcher: typeof fetch): Promise<{ status: number; data: unknown } | null> {
  if (!credentials.apiKey || !credentials.secret || (credentials.environment !== "live" && credentials.environment !== "testnet")) return null;
  try {
    const params = new URLSearchParams({ ...fields, recvWindow: "5000", timestamp: String(Date.now()) });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(credentials.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(params.toString()));
    params.set("signature", Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""));
    const response = await fetcher(`${host(credentials.environment)}/api/v3/order?${params}`, { method, headers: { "X-MBX-APIKEY": credentials.apiKey }, signal: AbortSignal.timeout(12000) });
    if (Number(response.headers.get("content-length") || 0) > 16384) return null;
    const text = await response.text();
    if (text.length > 16384) return null;
    return { status: response.status, data: JSON.parse(text) };
  } catch { return null; }
}

function validIdentity(symbol: string, clientOrderId: string): boolean {
  return /^[A-Z0-9]{2,20}USDT$/.test(symbol) && /^[A-Za-z0-9_-]{1,36}$/.test(clientOrderId);
}

/** Caller must persist intent and run independent risk checks before calling; no automatic retries. */
export async function submitMarketOrder(credentials: Credentials, symbol: string, side: "BUY" | "SELL", quoteOrderQty: string, clientOrderId: string, fetcher: typeof fetch = fetch): Promise<OrderSubmission> {
  if (!validIdentity(symbol, clientOrderId) || (side !== "BUY" && side !== "SELL") || !/^(?:0|[1-9]\d{0,17})(?:\.\d{1,8})?$/.test(quoteOrderQty) || Number(quoteOrderQty) <= 0) return { status: "unknown" };
  const response = await signedRequest(credentials, "POST", { symbol, side, type: "MARKET", quoteOrderQty, newClientOrderId: clientOrderId, newOrderRespType: "FULL" }, fetcher);
  if (!response) return { status: "unknown" };
  const data = response.data as Record<string, unknown> | null;
  if (response.status >= 200 && response.status < 300 && data?.symbol === symbol && data.clientOrderId === clientOrderId && typeof data.orderId === "number") return { status: "accepted", order: data };
  // Treat every non-success response as uncertain until reconciled; do not infer a safe retry.
  return { status: "unknown" };
}

/** A missing, malformed, or failed lookup remains unknown, not permission to submit again. */
export async function lookupOrder(credentials: Credentials, symbol: string, clientOrderId: string, fetcher: typeof fetch = fetch): Promise<OrderLookup> {
  if (!validIdentity(symbol, clientOrderId)) return { status: "unknown" };
  const response = await signedRequest(credentials, "GET", { symbol, origClientOrderId: clientOrderId }, fetcher);
  const data = response?.data as Record<string, unknown> | null | undefined;
  if (response && response.status === 200 && data?.symbol === symbol && data.clientOrderId === clientOrderId && typeof data.orderId === "number" && typeof data.status === "string") return { status: "found", order: data };
  return { status: "unknown" };
}
