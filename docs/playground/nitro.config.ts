import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
  preset: process.env.NITRO_TEST_NODE === "1" ? "node-server" : "cloudflare-module",
  compatibilityDate: "2026-11-02",
  cloudflare: { nodeCompat: true },
});
