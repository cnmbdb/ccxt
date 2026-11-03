import { definePlugin } from "nitro";
import { setGlobalDispatcher, EnvHttpProxyAgent } from "undici";

export default definePlugin(() => {
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
});
