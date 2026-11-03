export const MCP_RESOURCE = "https://agent.binance.com/mcp/agentic";
export const MCP_CLIENT_ID = "https://binance-agent-botos.pages.dev/oauth-client.json";
export const MCP_REDIRECT_URI = "https://binance-agent-botos.1733206793.workers.dev/api/mcp/callback";
const AUTHORIZATION_ENDPOINT = "https://accounts.binance.com/agentic-oauth/authorize";
const TOKEN_ENDPOINT = "https://accounts.binance.com/oauth-agentic/token";

function base64url(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function randomToken(): string { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
export async function hashState(value: string): Promise<string> { return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))); }

export async function createAuthorization(): Promise<{ state: string; verifier: string; url: string }> {
  const state = randomToken();
  const verifier = randomToken();
  const challenge = await hashState(verifier);
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({ response_type: "code", client_id: MCP_CLIENT_ID, redirect_uri: MCP_REDIRECT_URI, resource: MCP_RESOURCE, state, code_challenge: challenge, code_challenge_method: "S256" }).toString();
  return { state, verifier, url: url.toString() };
}

export async function exchangeAuthorization(code: string, verifier: string, fetcher: typeof fetch = fetch): Promise<Record<string, unknown> | null> {
  if (!/^[A-Za-z0-9._~-]{1,4096}$/.test(code) || !/^[A-Za-z0-9_-]{43}$/.test(verifier)) return null;
  try {
    const response = await fetcher(TOKEN_ENDPOINT, { method: "POST", redirect: "error", signal: AbortSignal.timeout(10000), headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: MCP_CLIENT_ID, code, code_verifier: verifier, redirect_uri: MCP_REDIRECT_URI, resource: MCP_RESOURCE }) });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    let raw = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      if (raw.length > 16384) { await reader.cancel(); return null; }
    }
    const result = JSON.parse(raw) as Record<string, unknown>;
    if (typeof result.access_token !== "string" || !result.access_token || typeof result.token_type !== "string" || result.token_type.toLowerCase() !== "bearer") return null;
    return result;
  } catch { return null; }
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("vault key must be 32 bytes");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function seal(secret: string, plaintext: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, await encryptionKey(secret), new TextEncoder().encode(plaintext)));
  return JSON.stringify({ iv: base64url(nonce), data: base64url(encrypted) });
}
export async function unseal(secret: string, envelope: string): Promise<string> {
  const value = JSON.parse(envelope);
  const decode = (input: string) => Uint8Array.from(atob(input.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(value.iv) }, await encryptionKey(secret), decode(value.data));
  return new TextDecoder().decode(plaintext);
}
