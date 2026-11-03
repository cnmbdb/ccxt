const target = "https://binance-agent-botos.1733206793.workers.dev";
export default {
  async fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(`${target}${url.pathname}${url.search}`, 307);
  },
};
