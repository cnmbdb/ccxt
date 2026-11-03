import { defineConfig, loadEnv } from "vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  for (const key of ["PLAYGROUND_AI_URL", "PLAYGROUND_LOG_FILE", "RUN_TIMEOUT_MS", "COMPILE_TIMEOUT_MS"]) {
    if (process.env[key] === undefined && env[key] !== undefined) process.env[key] = env[key];
  }
  const base = env.NEXT_BASE_PATH || "";
  return {
    base: base ? `${base}/` : "/",
    plugins: [nitro({ baseURL: base ? `${base}/` : "/" }), react()],
    environments: { nitro: { build: { rollupOptions: { external: ["ccxt"] } } } },
    resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
    define: {
      "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(base),
      "process.env.NEXT_PUBLIC_PLAYGROUND_DISABLED": JSON.stringify(env.NEXT_PUBLIC_PLAYGROUND_DISABLED || ""),
    },
    server: { host: "0.0.0.0", port: 3000 },
  };
});
