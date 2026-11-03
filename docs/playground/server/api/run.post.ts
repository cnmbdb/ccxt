import { defineHandler } from "nitro";
import { isLanguageId, isRunnable } from "@/lib/languages";
import { runCode } from "@/lib/runners";
import { clientIp, logEvent, truncate } from "@/lib/log";


const MAX_CODE_BYTES = 64 * 1024;

export default defineHandler(async (event) => {
  const request = event.req;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { language, code } = (body ?? {}) as { language?: string; code?: string };

  if (typeof language !== "string" || !isLanguageId(language)) {
    return Response.json({ error: "unsupported or missing language" }, { status: 400 });
  }
  if (!isRunnable(language)) {
    return Response.json(
      { error: `${language} runs locally, not in the browser playground — see the install command.` },
      { status: 400 },
    );
  }
  if (typeof code !== "string" || code.length === 0) {
    return Response.json({ error: "missing code" }, { status: 400 });
  }
  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    return Response.json({ error: "code too large" }, { status: 413 });
  }

  // Stream output as NDJSON so the client renders stdout/stderr live (one JSON
  // object per line): {type:"chunk",stream,data} repeated, then a terminal
  // {type:"end",...} (or {type:"error",message}). Errors during validation above
  // still return plain JSON with a non-2xx status; once we start streaming the
  // status is already 200, so failures surface as an "error" event.
  const ip = clientIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  const codeBytes = Buffer.byteLength(code, "utf8");
  const lang = language;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await runCode(lang, code, (s, data) =>
          send({ type: "chunk", stream: s, data }),
        );
        send({
          type: "end",
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          timedOut: result.timedOut,
          truncated: result.truncated,
        });
        logEvent({
          kind: "run", ip, ua, language: lang, codeBytes, code: truncate(code),
          durationMs: result.durationMs, exitCode: result.exitCode,
          timedOut: result.timedOut, truncated: result.truncated,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        send({ type: "error", message: `execution failed: ${message}` });
        logEvent({ kind: "run", ip, language: lang, code: truncate(code), error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // ask nginx not to buffer the stream
    },
  });
});
