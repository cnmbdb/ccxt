interface Env {
  LOADER: {
    load(options: {
      compatibilityDate: string;
      mainModule: string;
      modules: Record<string, string>;
      globalOutbound: null;
    }): { getEntrypoint(): { fetch(request: Request): Promise<Response> } };
  };
}

const MAX_CODE_BYTES = 64 * 1024;
const COMPATIBILITY_DATE = "2026-10-13";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON body" }, 400);
    }

    const { code, language } = (body ?? {}) as { code?: unknown; language?: unknown };
    if (language !== "ts" && language !== "js") return json({ error: "only TypeScript and JavaScript are supported by the Cloudflare executor" }, 400);
    if (typeof code !== "string" || code.trim().length === 0) return json({ error: "missing code" }, 400);
    if (new TextEncoder().encode(code).byteLength > MAX_CODE_BYTES) return json({ error: "code too large" }, 413);

    const source = language === "js" ? code : `
      // User code runs inside an isolated Dynamic Worker.
      ${code}
    `;
    const worker = env.LOADER.load({
      compatibilityDate: COMPATIBILITY_DATE,
      mainModule: "user.mjs",
      modules: {
        "user.mjs": `
          export default {
            async fetch() {
              const lines = [];
              const format = (value) => typeof value === "string" ? value : JSON.stringify(value);
              console.log = (...args) => lines.push(args.map(format).join(" "));
              console.error = (...args) => lines.push(args.map(format).join(" "));
              try {
                const result = await (async () => { ${source}\n })();
                if (result !== undefined) lines.push(format(result));
                return Response.json({ exitCode: 0, stdout: lines.join("\\n") + (lines.length ? "\\n" : ""), stderr: "" });
              } catch (error) {
                return Response.json({ exitCode: 1, stdout: lines.join("\\n") + (lines.length ? "\\n" : ""), stderr: error instanceof Error ? error.stack ?? error.message : String(error) });
              }
            }
          };
        `,
      },
      globalOutbound: null,
    });

    const result = await worker.getEntrypoint().fetch(new Request("https://sandbox.invalid/"));
    const output = await result.json() as { exitCode: number; stdout: string; stderr: string };
    const encoder = new TextEncoder();
    const events = [
      ...(output.stdout ? [{ type: "chunk", stream: "stdout", data: output.stdout }] : []),
      ...(output.stderr ? [{ type: "chunk", stream: "stderr", data: output.stderr }] : []),
      { type: "end", exitCode: output.exitCode, durationMs: 0, timedOut: false, truncated: false },
    ];
    return new Response(events.map((event) => JSON.stringify(event)).join("\n") + "\n", {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
    });
  },
};
