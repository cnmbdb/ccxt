export type Signal = { action: "buy" | "sell" | "hold"; symbol: string; confidence: number; reason: string };

/** Reject unstructured, unexpected or invalid model output; no execution authority is granted. */
export function parseSignal(value: unknown, expectedSymbol: string): Signal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((key) => !["action", "symbol", "confidence", "reason"].includes(key))) return null;
  if (result.action !== "buy" && result.action !== "sell" && result.action !== "hold") return null;
  if (result.symbol !== expectedSymbol || typeof result.confidence !== "number" || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) return null;
  if (typeof result.reason !== "string" || result.reason.trim().length === 0 || result.reason.length > 1000) return null;
  return { action: result.action, symbol: expectedSymbol, confidence: result.confidence, reason: result.reason };
}

export interface ModelConfig { endpoint: string; apiKey: string; model: string; }

export async function requestSignal(config: ModelConfig, symbol: string, market: unknown, fetcher: typeof fetch = fetch): Promise<Signal | null> {
  if (!config.apiKey || !config.model || !/^https:\/\//.test(config.endpoint)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetcher(config.endpoint, {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, temperature: 0, response_format: { type: "json_object" }, messages: [
        { role: "system", content: "Return only JSON with action (buy, sell, hold), symbol, confidence (0-1), reason. If uncertain return hold. You cannot execute orders." },
        { role: "user", content: JSON.stringify({ symbol, market }) },
      ] }),
    });
    if (!response.ok || Number(response.headers.get("content-length") || 0) > 65536) return null;
    if (!response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 65536) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const raw = new TextDecoder().decode(bytes);
    const payload = JSON.parse(raw);
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length > 4096) return null;
    return parseSignal(JSON.parse(content), symbol);
  } catch { return null; } finally { clearTimeout(timeout); }
}
