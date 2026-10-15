"use client";

import { useEffect, useState, type ElementType, type FormEvent } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Bot,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Download,
  Ellipsis,
  FlaskConical,
  Globe2,
  LayoutDashboard,
  Menu,
  Moon,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Square,
  Sun,
  Unplug,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Robot = {
  id: string;
  name: string;
  pair: string;
  strategy: string;
  budget: number;
  running: boolean;
  created: string;
};
type Risk = {
  order: number;
  position: number;
  loss: number;
  cooldown: boolean;
  stopLoss: boolean;
};
const initialBots: Robot[] = [
  {
    id: "btc-grid",
    name: "BTC 稳健网格",
    pair: "BTC/USDT",
    strategy: "现货网格",
    budget: 2000,
    running: false,
    created: "示例模板",
  },
  {
    id: "eth-trend",
    name: "ETH 趋势追踪",
    pair: "ETH/USDT",
    strategy: "双均线趋势",
    budget: 1500,
    running: false,
    created: "示例模板",
  },
  {
    id: "sol-dca",
    name: "SOL 定投计划",
    pair: "SOL/USDT",
    strategy: "定时定额",
    budget: 500,
    running: false,
    created: "示例模板",
  },
];
const nav: { id: string; label: string; icon: ElementType; group?: string }[] =
  [
    { id: "overview", label: "总览", icon: LayoutDashboard },
    { id: "bots", label: "交易机器人", icon: Bot },
    { id: "strategies", label: "策略库", icon: ChartNoAxesCombined },
    { id: "orders", label: "订单与成交", icon: ArrowDownLeft },
    { id: "exchanges", label: "交易所", icon: Globe2, group: "管理" },
    { id: "risk", label: "风险控制", icon: ShieldCheck },
    { id: "settings", label: "系统设置", icon: Settings2 },
  ];
const money = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const field = "grid gap-2";
const selectStyle =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export default function Dashboard() {
  const [view, setView] = useState("overview");
  const [theme, setTheme] = useState("dark");
  const [mobile, setMobile] = useState(false);
  const [bots, setBots] = useState<Robot[]>(initialBots);
  const [risk, setRisk] = useState<Risk>({
    order: 100,
    position: 30,
    loss: 50,
    cooldown: true,
    stopLoss: true,
  });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [create, setCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("7D");
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [connectionName, setConnectionName] = useState("OKX 模拟账户");
  const [logs, setLogs] = useState<string[]>([]);
  const [draft, setDraft] = useState({
    name: "",
    pair: "BTC/USDT",
    strategy: "现货网格",
    budget: "1000",
  });
  const [settings, setSettings] = useState({
    name: "我的量化工作台",
    notifications: true,
  });
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "dark");
    try {
      const raw = JSON.parse(
        localStorage.getItem("quant-console-v1") || "null",
      );
      if (raw?.bots && Array.isArray(raw.bots)) setBots(raw.bots);
      if (raw?.risk) setRisk(raw.risk);
      if (raw?.settings) setSettings(raw.settings);
      if (raw?.connectionName) setConnectionName(raw.connectionName);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "quant-console-v1",
          JSON.stringify({ bots, risk, settings, connectionName }),
        );
      } catch {
        setNotice("浏览器存储不可用，当前设置仅在本次会话保留。");
      }
  }, [bots, risk, settings, connectionName, ready]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }
  function changeView(id: string) {
    setView(id);
    setMobile(false);
    setSearch("");
  }
  function log(message: string) {
    setLogs((prev) =>
      [
        `${new Date().toLocaleTimeString("zh-CN", { hour12: false })}  ${message}`,
        ...prev,
      ].slice(0, 30),
    );
    setNotice(message);
  }
  function toggleBot(id: string) {
    const bot = bots.find((b) => b.id === id);
    if (!bot) return;
    setBots((prev) =>
      prev.map((b) => (b.id === id ? { ...b, running: !b.running } : b)),
    );
    log(
      `${bot.name}：${bot.running ? "已暂停" : "已开启本地状态演示，不执行交易"}`,
    );
  }
  function stopAll() {
    setBots((prev) => prev.map((b) => ({ ...b, running: false })));
    log("所有机器人本地演示状态已停止");
  }
  function addBot(event: FormEvent) {
    event.preventDefault();
    const budget = Number(draft.budget);
    if (!draft.name.trim() || !Number.isFinite(budget) || budget <= 0) return;
    setBots((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        pair: draft.pair,
        strategy: draft.strategy,
        budget,
        running: false,
        created: "本地配置",
      },
    ]);
    setCreate(false);
    setDraft({ ...draft, name: "" });
    log("机器人配置已创建，等待连接交易执行服务");
  }
  const running = bots.filter((b) => b.running).length;
  const current = nav.find((n) => n.id === view)!;
  const filtered = bots.filter((b) =>
    (b.name + b.pair + b.strategy).toLowerCase().includes(search.toLowerCase()),
  );
  const createDialog = (
    <Dialog open={create} onOpenChange={setCreate}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus size={14} />
          创建机器人
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>创建交易机器人</DialogTitle>
          <DialogDescription>
            保存本地配置。当前尚未连接交易执行服务。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={addBot} className="grid gap-4 pt-2">
          <div className={field}>
            <Label htmlFor="bot-name">机器人名称</Label>
            <Input
              id="bot-name"
              required
              maxLength={40}
              placeholder="例如 BTC 稳健网格"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <Label htmlFor="pair">交易对</Label>
              <select
                id="pair"
                className={selectStyle}
                value={draft.pair}
                onChange={(e) => setDraft({ ...draft, pair: e.target.value })}
              >
                {["BTC/USDT", "ETH/USDT", "SOL/USDT"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={field}>
              <Label htmlFor="strategy">策略</Label>
              <select
                id="strategy"
                className={selectStyle}
                value={draft.strategy}
                onChange={(e) =>
                  setDraft({ ...draft, strategy: e.target.value })
                }
              >
                {["现货网格", "双均线趋势", "定时定额"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={field}>
            <Label htmlFor="budget">分配资金 · USDT</Label>
            <Input
              id="budget"
              type="number"
              min="1"
              max="1000000"
              required
              value={draft.budget}
              onChange={(e) => setDraft({ ...draft, budget: e.target.value })}
            />
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            交易所：OKX 模拟盘 · 创建后默认暂停
          </div>
          <Button type="submit">创建配置</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
  function botTable(compact = false) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">机器人 / 交易对</TableHead>
              <TableHead>策略</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">分配资金</TableHead>
              {!compact && (
                <TableHead className="text-right">累计盈亏</TableHead>
              )}
              <TableHead className="pr-5 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((bot, i) => (
              <TableRow key={bot.id}>
                <TableCell className="py-3 pl-5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg border bg-muted/50">
                      <Bot size={15} />
                    </div>
                    <div>
                      <div className="font-medium">{bot.name}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {bot.pair} <span className="px-1">·</span> OKX 模拟盘
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {bot.strategy}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 text-[10px] font-normal",
                      bot.running &&
                        "border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        bot.running ? "bg-emerald-500" : "bg-muted-foreground",
                      )}
                    />
                    {bot.running ? "模拟运行" : "已暂停"}
                  </Badge>
                </TableCell>
                <TableCell className="number text-right">
                  {money(bot.budget)}{" "}
                  <span className="text-[10px] text-muted-foreground">
                    USDT
                  </span>
                </TableCell>
                {!compact && (
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                )}
                <TableCell className="pr-5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => toggleBot(bot.id)}
                  >
                    {bot.running ? <Pause size={12} /> : <Play size={12} />}{" "}
                    {bot.running ? "暂停" : "模拟启动"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={compact ? 5 : 6}
                  className="h-28 text-center text-muted-foreground"
                >
                  没有符合条件的机器人
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[210px] flex-col border-r bg-card transition-transform md:translate-x-0",
          mobile ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-5 pb-2 pt-5 text-[10px] text-muted-foreground">
          工作空间
        </div>
        <nav className="space-y-1 px-3" aria-label="主导航">
          {nav.map((item) => (
            <div key={item.id}>
              {item.group && (
                <div className="px-2 pb-2 pt-6 text-[10px] text-muted-foreground">
                  {item.group}
                </div>
              )}
              <button
                onClick={() => changeView(item.id)}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-xs transition-colors",
                  view === item.id
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon size={15} />
                {item.label}
                {item.id === "bots" && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {bots.length.toString().padStart(2, "0")}
                  </span>
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="mt-auto p-3">
          <button
            onClick={() =>
              setNotice(
                "先连接 OKX 模拟盘，再接入策略执行服务。当前页面支持本地配置管理。 ",
              )
            }
            className="flex w-full items-center gap-2 px-2 py-2 text-xs text-muted-foreground"
          >
            <CircleHelp size={14} />
            使用帮助
            <ArrowUpRight size={12} className="ml-auto" />
          </button>
          <Separator />
          <div className="flex items-center gap-2.5 px-2 pt-4">
            <div className="grid size-7 place-items-center rounded-full border bg-muted text-[10px]">
              HF
            </div>
            <div>
              <div className="text-xs">个人账户</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                本机开发版
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto size-7"
              aria-label="系统设置"
              onClick={() => changeView("settings")}
            >
              <Settings2 size={13} />
            </Button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="关闭导航"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="md:ml-[210px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-2 text-xs">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 md:hidden"
              aria-label="打开导航"
              onClick={() => setMobile(true)}
            >
              <Menu size={16} />
            </Button>
            <span className="hidden text-muted-foreground sm:inline">
              工作空间
            </span>
            <ChevronRight
              size={12}
              className="hidden text-muted-foreground sm:block"
            />
            <span>{current.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="gap-1.5 rounded text-[10px] font-normal"
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              模拟模式
            </Badge>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={theme === "dark" ? "切换浅色主题" : "切换深色主题"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="通知"
              onClick={() =>
                setNotice("暂无新通知。交易所和执行服务尚未连接。")
              }
            >
              <Bell size={15} />
            </Button>
            <div className="grid size-7 place-items-center rounded-full bg-muted text-[10px]">
              HF
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {view === "overview" ? "交易总览" : current.label}
                </h1>
                {view === "overview" && (
                  <span className="mt-1 text-xs text-muted-foreground">
                    Overview
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {view === "overview"
                  ? "你的策略、资金与风险，尽在掌握。"
                  : view === "bots"
                    ? "创建和管理策略配置，追踪机器人运行状态。"
                    : view === "risk"
                      ? "设置交易边界，在执行前控制风险。"
                      : "管理你的量化交易工作空间。"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={stopAll}
                disabled={!running}
              >
                <Square size={11} />
                全部暂停
              </Button>
              {createDialog}
            </div>
          </div>
          <div className="mb-5 flex items-center gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/[.04] px-3 py-2.5 text-[11px]">
            <FlaskConical
              size={14}
              className="shrink-0 text-amber-600 dark:text-amber-400"
            />
            <span className="text-muted-foreground">
              当前为本地配置与交互演示，账户、行情与交易执行尚未接入。
            </span>
            <button
              onClick={() => changeView("exchanges")}
              className="ml-auto flex shrink-0 items-center gap-1 font-medium"
            >
              连接交易所
              <ArrowUpRight size={12} />
            </button>
          </div>
          {view === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: "账户总资产",
                    value: "—",
                    unit: "USDT",
                    note: "连接交易所后同步",
                    icon: Wallet,
                  },
                  {
                    label: "今日收益",
                    value: "—",
                    unit: "USDT",
                    note: "尚无真实成交记录",
                    icon: ChartNoAxesCombined,
                  },
                  {
                    label: "交易机器人",
                    value: String(bots.length).padStart(2, "0"),
                    unit: "个",
                    note: `${running} 个本地演示运行 · ${bots.length - running} 个已暂停`,
                    icon: Bot,
                  },
                  {
                    label: "风控状态",
                    value: "已配置",
                    unit: "",
                    note: `单笔上限 ${risk.order} USDT · 待执行服务接入`,
                    icon: ShieldCheck,
                  },
                ].map((item) => (
                  <Card
                    key={item.label}
                    className="gap-0 rounded-lg py-0 shadow-none"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {item.label}
                        <item.icon size={14} />
                      </div>
                      <div className="number mb-2 mt-4 text-[27px] font-semibold leading-none">
                        {item.value}
                        <span className="ml-2 text-[10px] font-normal tracking-normal text-muted-foreground">
                          {item.unit}
                        </span>
                      </div>
                      <div className="pt-1 text-[10px] text-muted-foreground">
                        {item.note}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-none">
                  <div className="flex items-center justify-between px-5 pt-4">
                    <div>
                      <h2 className="text-xs font-medium">策略净值走势</h2>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        归一化净值 · 示例数据
                      </div>
                    </div>
                    <div className="flex rounded-md border p-0.5">
                      {["24H", "7D", "30D", "全部"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setPeriod(t)}
                          className={cn(
                            "rounded px-2 py-1 text-[10px]",
                            period === t
                              ? "bg-accent font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative mx-5 mb-1 mt-5">
                    <div className="number mb-2 text-2xl font-semibold">
                      1.0842{" "}
                      <span className="ml-2 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                        +8.42%{" "}
                        <span className="text-muted-foreground">示例</span>
                      </span>
                    </div>
                    <EquityChart period={period} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 border-t px-5 py-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-3 bg-foreground" />
                      策略净值示例
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-3 border-t border-dashed border-muted-foreground" />
                      初始净值
                    </span>
                    <span className="ml-auto">
                      仅供布局预览，不代表交易表现
                    </span>
                  </div>
                </Card>
                <Card className="gap-0 rounded-lg py-0 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between px-4 py-4">
                    <CardTitle className="text-xs font-medium">
                      运行环境
                    </CardTitle>
                    <Radio size={13} className="text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {[
                        { label: "控制台", status: "本机运行", good: true },
                        {
                          label: "交易执行服务",
                          status: "未连接",
                          good: false,
                        },
                        { label: "OKX 模拟盘", status: "未连接", good: false },
                        { label: "AI 分析", status: "未配置", good: false },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="text-muted-foreground">
                            {s.label}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                s.good
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground/40",
                              )}
                            />
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                    <div className="mb-3 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        资金分配（配置）
                      </span>
                      <span className="number">
                        {money(bots.reduce((n, b) => n + b.budget, 0))} USDT
                      </span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                      {bots.map((b, i) => (
                        <div
                          key={b.id}
                          style={{
                            width: `${
                              (b.budget /
                                Math.max(
                                  1,
                                  bots.reduce((n, b) => n + b.budget, 0),
                                )) *
                              100
                            }%`,
                            opacity: 1 - i * 0.15,
                          }}
                          className="border-r border-card bg-foreground"
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                      {bots.slice(0, 3).map((b, i) => (
                        <span key={b.id} className="flex items-center gap-1">
                          <span
                            style={{ opacity: 1 - i * 0.15 }}
                            className="size-1.5 rounded-full bg-foreground"
                          />
                          {b.pair.split("/")[0]}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-5 w-full gap-2 text-xs"
                      onClick={() => changeView("exchanges")}
                    >
                      <Plus size={12} />
                      配置交易所
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <Card className="mt-4 gap-0 overflow-hidden rounded-lg py-0 shadow-none">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    我的机器人
                    <Badge
                      variant="secondary"
                      className="rounded px-1.5 text-[10px]"
                    >
                      {bots.length}
                    </Badge>
                  </div>
                  <button
                    onClick={() => changeView("bots")}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    查看全部
                    <ChevronRight size={12} />
                  </button>
                </div>
                {botTable(true)}
              </Card>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card className="gap-0 rounded-lg py-0 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between px-5 py-4">
                    <CardTitle className="text-xs font-medium">
                      最近活动
                    </CardTitle>
                    <Clock3 size={13} className="text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-3 px-5 pb-4">
                    {(logs.length
                      ? logs.slice(0, 3)
                      : [
                          "控制台已就绪，可创建机器人配置",
                          "交易执行服务尚未连接",
                          "配置只保存在当前浏览器中",
                        ]
                    ).map((l, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-[11px]"
                      >
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        <span className="text-muted-foreground">{l}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="gap-0 rounded-lg py-0 shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-xs font-medium">
                      开始你的第一笔模拟交易
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-3 px-5 pb-4">
                    {["连接模拟账户", "配置机器人", "接入执行服务"].map(
                      (t, i) => (
                        <button
                          onClick={() =>
                            changeView(i === 1 ? "bots" : "exchanges")
                          }
                          key={t}
                          className="flex flex-1 items-center gap-2 rounded border p-2.5 text-left text-[10px]"
                        >
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                            {i + 1}
                          </span>
                          {t}
                        </button>
                      ),
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          {view === "bots" && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <div className="relative max-w-xs flex-1">
                  <Search
                    size={13}
                    className="absolute left-3 top-2.5 text-muted-foreground"
                  />
                  <Input
                    aria-label="搜索机器人"
                    className="h-8 pl-8 text-xs"
                    placeholder="搜索名称、策略或交易对…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="font-normal">
                  全部 {bots.length}
                </Badge>
              </div>
              <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-none">
                {botTable()}
              </Card>
            </>
          )}
          {view === "strategies" && (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  name: "现货网格",
                  tag: "区间震荡",
                  text: "在设定价格区间内，按固定网格配置买卖计划。",
                  icon: LayoutDashboard,
                },
                {
                  name: "双均线趋势",
                  tag: "趋势跟随",
                  text: "通过快慢均线交叉生成方向信号。",
                  icon: ChartNoAxesCombined,
                },
                {
                  name: "定时定额",
                  tag: "长期配置",
                  text: "按固定时间间隔配置定额买入计划。",
                  icon: Clock3,
                },
              ].map((s) => (
                <Card key={s.name} className="gap-4 rounded-lg shadow-none">
                  <CardHeader>
                    <div className="mb-2 grid size-9 place-items-center rounded-lg border bg-muted/40">
                      <s.icon size={17} />
                    </div>
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      className="mt-1 w-fit text-[10px] font-normal"
                    >
                      {s.tag}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-5 min-h-10 text-xs leading-6 text-muted-foreground">
                      {s.text}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setDraft({
                          ...draft,
                          strategy: s.name,
                          name: s.name + "机器人",
                        });
                        setCreate(true);
                      }}
                    >
                      使用此模板
                      <ArrowUpRight size={12} />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {view === "orders" && (
            <Card className="gap-0 rounded-lg shadow-none">
              <CardContent>
                <Tabs defaultValue="orders">
                  <TabsList>
                    <TabsTrigger value="orders">当前委托</TabsTrigger>
                    <TabsTrigger value="trades">成交记录</TabsTrigger>
                    <TabsTrigger value="logs">运行日志</TabsTrigger>
                  </TabsList>
                  <TabsContent value="orders">
                    <Empty
                      icon={ArrowDownLeft}
                      title="暂无委托订单"
                      text="连接交易所和执行服务后，委托将在这里同步。"
                    />
                  </TabsContent>
                  <TabsContent value="trades">
                    <Empty
                      icon={ChartNoAxesCombined}
                      title="暂无成交记录"
                      text="真实成交和收益将根据交易所返回的数据计算。"
                    />
                  </TabsContent>
                  <TabsContent value="logs">
                    <div className="min-h-52 py-5 font-mono text-xs leading-8 text-muted-foreground">
                      {logs.length
                        ? logs.map((l, i) => <div key={i}>{l}</div>)
                        : "暂无操作日志"}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
          {view === "exchanges" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <Card className="gap-4 rounded-lg shadow-none">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-lg bg-primary font-bold tracking-tighter text-primary-foreground">
                    OKX
                  </div>
                  <div>
                    <CardTitle className="text-sm">{connectionName}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      现货 · Demo trading
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-auto text-[10px] font-normal"
                  >
                    未连接
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-4 text-xs">
                    {["账户余额", "API 延迟", "最近同步"].map((l) => (
                      <div key={l}>
                        <div className="mb-2 text-[10px] text-muted-foreground">
                          {l}
                        </div>
                        —
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-5 gap-2 text-xs"
                    onClick={() => setExchangeOpen(true)}
                  >
                    <Settings2 size={13} />
                    配置账户
                  </Button>
                </CardContent>
              </Card>
              <Card className="gap-3 rounded-lg shadow-none">
                <CardHeader>
                  <CardTitle className="text-xs">连接说明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-6 text-muted-foreground">
                  <p>第一阶段使用 OKX 模拟盘，独立配置模拟账户 API。</p>
                  <p>
                    密钥需由后端加密保存。当前版本仅保存账户名称，不收集 API
                    密钥。
                  </p>
                  <Badge variant="outline" className="font-normal">
                    CCXT 适配层待接入
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
          {view === "risk" && (
            <Card className="max-w-3xl gap-3 rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">全局风控规则</CardTitle>
                <p className="text-xs text-muted-foreground">
                  当前保存为本地配置，接入执行服务后才能实际拦截交易。
                </p>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    log("风控配置已保存到当前浏览器，等待执行服务接入");
                  }}
                  className="space-y-5"
                >
                  {[
                    {
                      key: "order" as const,
                      label: "单笔订单金额上限",
                      unit: "USDT",
                      max: 1000000,
                    },
                    {
                      key: "position" as const,
                      label: "单个机器人最大仓位",
                      unit: "%",
                      max: 100,
                    },
                    {
                      key: "loss" as const,
                      label: "每日亏损上限",
                      unit: "USDT",
                      max: 1000000,
                    },
                  ].map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-4 border-b pb-4"
                    >
                      <Label htmlFor={f.key} className="text-xs">
                        {f.label}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={f.key}
                          required
                          className="h-8 w-28 text-right"
                          type="number"
                          min="1"
                          max={f.max}
                          value={risk[f.key]}
                          onChange={(e) =>
                            setRisk({
                              ...risk,
                              [f.key]: Number(e.target.value),
                            })
                          }
                        />
                        <span className="w-9 text-[10px] text-muted-foreground">
                          {f.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                  {[
                    {
                      key: "cooldown" as const,
                      title: "连续亏损冷却",
                      desc: "连续亏损后暂停策略，等待人工复核。",
                    },
                    {
                      key: "stopLoss" as const,
                      title: "触及亏损上限停止",
                      desc: "达到每日亏损限额后禁止新增订单。",
                    },
                  ].map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <div>
                        <Label htmlFor={f.key} className="text-xs">
                          {f.title}
                        </Label>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {f.desc}
                        </p>
                      </div>
                      <Switch
                        id={f.key}
                        checked={risk[f.key]}
                        onCheckedChange={(v) =>
                          setRisk({ ...risk, [f.key]: v })
                        }
                      />
                    </div>
                  ))}
                  <Separator />
                  <Button type="submit" size="sm" className="gap-2 text-xs">
                    <Check size={13} />
                    保存风控配置
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          {view === "settings" && (
            <Card className="max-w-3xl gap-3 rounded-lg shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">工作空间设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={field}>
                  <Label htmlFor="workspace-name" className="text-xs">
                    工作空间名称
                  </Label>
                  <Input
                    id="workspace-name"
                    maxLength={30}
                    value={settings.name}
                    onChange={(e) =>
                      setSettings({ ...settings, name: e.target.value })
                    }
                    className="max-w-sm"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium">外观主题</div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      纯黑和纯白，自适应所有管理页面。
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="gap-2 text-xs"
                  >
                    {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                    切换为{theme === "dark" ? "浅色" : "深色"}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications" className="text-xs">
                      本地通知偏好
                    </Label>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      保存提醒偏好，通知服务待接入。
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={settings.notifications}
                    onCheckedChange={(v) =>
                      setSettings({ ...settings, notifications: v })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span>AI 分析服务</span>
                  <Badge variant="outline" className="font-normal">
                    尚未配置
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => log("工作空间设置已保存")}
                >
                  <Check size={13} />
                  保存设置
                </Button>
              </CardContent>
            </Card>
          )}
          <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[10px] text-muted-foreground">
            <span>
              Quant Console <span className="mx-2">/</span> 本机开发版
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-emerald-500" />
              配置保存在当前浏览器 <span className="mx-2">·</span> CCXT
              引擎待接入
            </span>
          </footer>
        </main>
      </div>
      <Dialog open={exchangeOpen} onOpenChange={setExchangeOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>配置 OKX 模拟账户</DialogTitle>
            <DialogDescription>
              当前只保存账户显示名称。API 密钥管理将在后端连接功能中提供。
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setExchangeOpen(false);
              log("账户名称已保存，交易所仍未连接");
            }}
          >
            <Label htmlFor="account-name">账户名称</Label>
            <Input
              required
              id="account-name"
              maxLength={40}
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
            />
            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              交易模式：OKX Demo · 连接状态：未连接
            </div>
            <Button type="submit">保存账户名称</Button>
          </form>
        </DialogContent>
      </Dialog>
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100%-40px)] items-center gap-3 rounded-lg border bg-popover px-4 py-3 text-xs shadow-xl"
        >
          <Check size={14} className="shrink-0" />
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
      <div className="grid size-12 place-items-center rounded-xl border bg-muted/40">
        <Icon size={20} className="text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <p className="max-w-xs text-xs leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
function EquityChart({ period }: { period: string }) {
  const seed =
    period === "24H" ? 2 : period === "30D" ? 4 : period === "全部" ? 5 : 3;
  const values = Array.from(
    { length: 70 },
    (_, i) =>
      75 - i * 0.65 - Math.sin(i * 0.6 + seed) * 4 - Math.sin(i * 1.7) * 2,
  );
  const points = values
    .map((v, i) => `${((i / 69) * 700).toFixed(2)},${(v * 1.6).toFixed(2)}`)
    .join(" ");
  return (
    <div>
      <div className="relative h-[180px] pl-0 pr-9">
        <div className="subtle-grid absolute inset-y-0 left-0 right-9 border-b" />
        <svg
          viewBox="0 0 700 160"
          preserveAspectRatio="none"
          className="relative h-full w-full overflow-visible"
          role="img"
          aria-label={`${period} 示例策略净值走势图，不代表实际交易收益`}
        >
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,180 ${points} 700,180`} fill="url(#equityFill)" />
          <line
            x1="0"
            y1="136"
            x2="700"
            y2="136"
            stroke="currentColor"
            opacity=".2"
            strokeDasharray="4 4"
          />
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="absolute inset-y-0 right-0 flex flex-col justify-between text-[9px] text-muted-foreground">
          <span>1.100</span>
          <span>1.075</span>
          <span>1.050</span>
          <span>1.025</span>
          <span>1.000</span>
        </div>
      </div>
      <div className="mb-3 mt-3 flex justify-between pr-9 text-[9px] text-muted-foreground">
        {["起点", "20%", "40%", "60%", "80%", "当前"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}
