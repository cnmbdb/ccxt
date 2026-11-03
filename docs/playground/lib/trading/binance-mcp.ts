export const BINANCE_MCP_ENDPOINT = "https://agent.binance.com/mcp/agentic";
export const BINANCE_SKILLS_HUB = "https://www.binance.com/en/skills";
export const BINANCE_AGENT_OS = "https://www.binance.com/en/agent-os";

/** Read the fixed server's OAuth challenge; authorization and token storage are separate. */
export async function discoverMcpAuthorization(fetcher: typeof fetch = fetch): Promise<{ authorizationRequired: boolean; resourceMetadata: string } | null> {
  try {
    const response = await fetcher(BINANCE_MCP_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "binance-agent-botos", version: "0.1.0" } } }),
      signal: AbortSignal.timeout(8000),
    });
    const challenge = response.headers.get("www-authenticate") || "";
    const match = /^Bearer\s+resource_metadata="(https:\/\/agent\.binance\.com\/\.well-known\/oauth-protected-resource\/gateway-mcp)"/i.exec(challenge);
    return response.status === 401 && match ? { authorizationRequired: true, resourceMetadata: match[1] } : null;
  } catch { return null; }
}
