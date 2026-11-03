import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emptySpotRisk, validateSpotRisk, type SpotRisk } from "@/lib/spot-risk";

export default function SpotRiskSettings() {
  const [draft, setDraft] = useState<SpotRisk>(emptySpotRisk);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/spot-risk", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("load failed");
      const { config } = await response.json();
      if (active && config) setDraft(config);
    }).catch(() => { if (active) setMessage("读取服务端风控配置失败，请检查登录状态或稍后重试。"); });
    return () => { active = false; };
  }, []);
  async function save() {
    const normalized = { ...draft, symbols: draft.symbols.toUpperCase().split(",").map((symbol) => symbol.trim()).join(", ") };
    const errors = validateSpotRisk(normalized);
    if (errors.length) { setMessage(errors.join(" ")); return; }
    try {
      const response = await fetch("/api/spot-risk", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(normalized) });
      if (!response.ok) throw new Error("save failed");
      setDraft(normalized);
      setMessage("已保存到服务端。执行服务尚未接入，规则尚不会拦截订单。");
    } catch { setMessage("保存失败，请检查登录状态或稍后重试。"); }
  }
  return <Card className="max-w-3xl gap-3 rounded-lg shadow-none">
    <CardHeader><CardTitle className="text-sm">币安现货风控设置</CardTitle><p className="text-xs text-muted-foreground">自动实盘未启用。执行服务接入并验证之前不会执行或拦截交易。</p></CardHeader>
    <CardContent><form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <div className="grid gap-2"><Label htmlFor="spot-symbols">允许交易对</Label><Input id="spot-symbols" value={draft.symbols} placeholder="BTC/USDT, ETH/USDT" onChange={(event) => setDraft({ ...draft, symbols: event.target.value })} /></div>
      {([
        ["maxOrder", "单笔订单上限（USDT）"],
        ["maxPosition", "总持仓上限（USDT）"],
        ["maxDailyLoss", "每日亏损上限（USDT）"],
      ] as const).map(([key, label]) => <div className="grid gap-2" key={key}><Label htmlFor={key}>{label}</Label><Input id={key} type="text" inputMode="decimal" placeholder="尚未设置" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value.trim() })} /></div>)}
      <div className="grid gap-2"><Label htmlFor="cancel-on-stop">触发停机时撤销未成交订单</Label><select id="cancel-on-stop" className="h-9 rounded-md border bg-background px-3 text-sm" value={draft.cancelOnStop === null ? "" : String(draft.cancelOnStop)} onChange={(event) => setDraft({ ...draft, cancelOnStop: event.target.value === "" ? null : event.target.value === "true" })}><option value="">请选择</option><option value="true">撤销</option><option value="false">保留</option></select></div>
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
      <Button type="submit" size="sm">保存风控配置</Button>
    </form></CardContent>
  </Card>;
}
