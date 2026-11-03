import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Runtime = { enabled: boolean; modelEndpoint: string; modelName: string };
const defaultRuntime: Runtime = { enabled: false, modelEndpoint: "https://api.openai.com/v1/chat/completions", modelName: "" };

export default function TradingIntegrations() {
  const [runtime, setRuntime] = useState(defaultRuntime);
  const [modelKeyConfigured, setModelKeyConfigured] = useState(false);
  const [exchangeCredentialsConfigured, setExchangeCredentialsConfigured] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/trading/runtime", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); }).then((runtimeData) => {
      if (!active) return;
      const saved = runtimeData.runtime ?? {};
      setRuntime({ enabled: Boolean(saved.enabled), modelEndpoint: saved.model_endpoint ?? saved.modelEndpoint ?? defaultRuntime.modelEndpoint, modelName: saved.model_name ?? saved.modelName ?? "" });
      setModelKeyConfigured(Boolean(runtimeData.modelKeyConfigured));
      setExchangeCredentialsConfigured(Boolean(runtimeData.exchangeCredentialsConfigured));
    }).catch(() => { if (active) setMessage("读取集成状态失败，请确认已通过 Cloudflare Access 登录。"); });
    return () => { active = false; };
  }, []);
  async function saveRuntime() {
    try {
      const response = await fetch("/api/trading/runtime", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...runtime, enabled: false }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setMessage("模型接口配置已保存；自动执行仍关闭，需先完成凭证和执行验证。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
  }
  return <div className="mt-4 grid max-w-3xl gap-4">
    <Card className="gap-3 rounded-lg shadow-none">
      <CardHeader><CardTitle className="text-sm">Binance Agent 能力</CardTitle><p className="text-xs text-muted-foreground">Binance MCP OAuth 目前只允许受支持的 Agent 客户端。本网站是自建控制台，不在 Binance 支持名单内，因此不能在此授权或接收 Codex 的 MCP 令牌。</p></CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">请从 Codex、ChatGPT、Claude 或 VS Code 的受支持 MCP 设置中添加 Binance MCP。</span>
        <a className="text-xs font-medium underline underline-offset-4" href="https://developers.binance.com/en/docs/agent-native/mcp-server/agentic" target="_blank" rel="noreferrer">打开 Binance MCP 官方接入步骤</a>
        <a className="text-xs underline underline-offset-4" href="https://www.binance.com/en/skills" target="_blank" rel="noreferrer">打开 Binance Skills Hub</a>
        <a className="text-xs underline underline-offset-4" href="https://www.binance.com/en/agent-os" target="_blank" rel="noreferrer">打开 Binance Agent OS</a>
      </CardContent>
    </Card>
    <Card className="gap-3 rounded-lg shadow-none">
      <CardHeader><CardTitle className="text-sm">AI 模型接口</CardTitle><p className="text-xs text-muted-foreground">API 密钥只从 Cloudflare Worker Secret 读取，不写入浏览器或数据库。</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2"><Label htmlFor="model-endpoint">OpenAI 兼容接口</Label><Input id="model-endpoint" value={runtime.modelEndpoint} onChange={(event) => setRuntime({ ...runtime, modelEndpoint: event.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="model-name">模型名称</Label><Input id="model-name" maxLength={128} value={runtime.modelName} placeholder="例如 gpt-4.1-mini" onChange={(event) => setRuntime({ ...runtime, modelName: event.target.value })} /></div>
        <div className="text-xs text-muted-foreground">模型密钥：{modelKeyConfigured ? "已配置" : "待在 Cloudflare 配置 MODEL_API_KEY"}；币安 Spot 密钥：{exchangeCredentialsConfigured ? "已配置" : "待在 Cloudflare 配置交易 API 密钥（禁止提现权限）"}</div>
        <Button type="button" size="sm" onClick={() => void saveRuntime()}>保存模型接口</Button>
      </CardContent>
    </Card>
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </div>;
}
