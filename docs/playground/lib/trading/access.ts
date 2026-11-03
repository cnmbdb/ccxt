const ISSUER = "https://hfzstore.cloudflareaccess.com";
const AUDIENCE = "f3b8a3eac994052664188370bb94c46edb87c330837928e1109ddf63e77275a0";
const ADMIN = "1733206793a@gmail.com";

function decodePart(part: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(part) || part.length > 8192) throw new Error("invalid encoding");
  const raw = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Defense in depth: verify the signed Access assertion, never trust a caller-supplied email header. */
export async function verifyAdministrator(token: string | null, fetcher: typeof fetch = fetch, now = Date.now()): Promise<boolean> {
  try {
    if (!token || token.length > 16384) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(new TextDecoder().decode(decodePart(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodePart(parts[1])));
    if (header.alg !== "RS256" || typeof header.kid !== "string" || claims.iss !== ISSUER || claims.email !== ADMIN || !Array.isArray(claims.aud) || !claims.aud.includes(AUDIENCE) || typeof claims.exp !== "number" || claims.exp <= now / 1000 || typeof claims.iat !== "number" || claims.iat > now / 1000 + 60 || (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > now / 1000))) return false;
    const response = await fetcher(`${ISSUER}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const body = await response.json() as { keys?: (JsonWebKey & { kid?: string })[] };
    const jwk = body.keys?.find((key) => key.kid === header.kid && key.kty === "RSA" && key.alg === "RS256");
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodePart(parts[2]) as BufferSource, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch { return false; }
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
