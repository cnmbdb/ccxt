const target = "https://binance-agent-botos.1733206793.workers.dev";
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/oauth-client.json" && request.method === "GET") {
      return Response.json({ client_id: "https://binance-agent-botos.pages.dev/oauth-client.json", client_name: "Binance Agent Botos", redirect_uris: [`${target}/api/mcp/callback`], grant_types: ["authorization_code"], response_types: ["code"], token_endpoint_auth_method: "none" }, { headers: { "cache-control": "public, max-age=300" } });
    }
    return Response.redirect(`${target}${url.pathname}${url.search}`, 307);
  },
};
