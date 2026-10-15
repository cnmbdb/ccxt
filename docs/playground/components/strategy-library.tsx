"use client";
import { useState } from "react";
import {
  Bot,
  Plus,
  Settings2,
  Copy,
  Trash2,
  Search,
  ArrowUpRight,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  capabilityOptions,
  createStrategy,
  kindNames,
  pairs,
  timeframes,
  validateStrategy,
  type StrategyConfig,
  type StrategyKind,
} from "@/lib/strategy-config";

type Props = {
  strategies: StrategyConfig[];
  onSave: (s: StrategyConfig) => boolean;
  onDelete: (id: string) => void;
  onUse: (s: StrategyConfig) => void;
  usedIds: string[];
};
function Choice({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-9 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export default function StrategyLibrary({
  strategies,
  onSave,
  onDelete,
  onUse,
  usedIds,
}: Props) {
  const [draft, setDraft] = useState<StrategyConfig | null>(null);
  const [tab, setTab] = useState("base");
  const [errors, setErrors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [remove, setRemove] = useState<StrategyConfig | null>(null);
  function edit(s: StrategyConfig) {
    setDraft(structuredClone(s));
    setErrors([]);
    setTab("base");
  }
  function add(kind: StrategyKind) {
    const s = createStrategy(kind, crypto.randomUUID());
    s.name = "";
    edit(s);
  }
  function save() {
    if (!draft) return;
    const next = { ...draft, name: draft.name.trim() };
    const issues = validateStrategy(next);
    if (issues.length) {
      setErrors(issues);
      return;
    }
    if (onSave(next)) setDraft(null);
    else setErrors(["已有同名策略，请更换名称"]);
  }
  const shown = strategies.filter(
    (s) =>
      (filter === "all" ||
        (filter === "agent" ? s.agent.enabled : !s.agent.enabled)) &&
      (s.name + s.description).toLowerCase().includes(query.toLowerCase()),
  );
  function numeric(
    key: "maxOrder" | "stopLoss",
    label: string,
    min: number,
    max: number,
    step = 1,
  ) {
    return (
      draft && (
        <div className="grid gap-2">
          <Label htmlFor={`strategy-${key}`} className="text-xs">
            {label}
          </Label>
          <Input
            id={`strategy-${key}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number.isNaN(draft[key]) ? "" : draft[key]}
            onChange={(e) =>
              setDraft({
                ...draft,
                [key]: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
        </div>
      )
    );
  }
  function parameter(
    key: keyof StrategyConfig["parameters"],
    label: string,
    min: number,
    max: number,
    step = 1,
  ) {
    return (
      draft && (
        <div className="grid gap-2">
          <Label htmlFor={`param-${key}`} className="text-xs">
            {label}
          </Label>
          <Input
            id={`param-${key}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={
              Number.isNaN(draft.parameters[key]) ? "" : draft.parameters[key]
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                parameters: {
                  ...draft.parameters,
                  [key]: e.target.value === "" ? NaN : Number(e.target.value),
                },
              })
            }
          />
        </div>
      )
    );
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-2.5 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索策略"
              placeholder="搜索策略…"
              className="h-8 w-44 pl-8 text-xs"
            />
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-8">
              <TabsTrigger className="text-xs" value="all">
                全部 {strategies.length}
              </TabsTrigger>
              <TabsTrigger className="text-xs" value="rules">
                规则
              </TabsTrigger>
              <TabsTrigger className="text-xs" value="agent">
                Agent
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => add("agent")}
          >
            <Bot size={13} />
            新增 Agent 策略
          </Button>
          <Button
            size="sm"
            className="gap-1 text-xs"
            onClick={() => add("ema")}
          >
            <Plus size={13} />
            新增策略
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((s) => (
          <Card key={s.id} className="gap-0 rounded-lg py-0 shadow-none">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-md border bg-muted/40">
                    {s.agent.enabled ? (
                      <Bot size={15} />
                    ) : (
                      <Settings2 size={15} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold">{s.name}</h2>
                    <span className="text-[10px] text-muted-foreground">
                      {kindNames[s.kind]}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-normal">
                  {s.agent.enabled ? "Agent 已配置" : "规则策略"}
                </Badge>
              </div>
              <p className="mb-4 line-clamp-2 min-h-8 text-[11px] leading-4 text-muted-foreground">
                {s.description ||
                  `${s.pair} · ${s.timeframe} 周期 · 单笔上限 ${s.maxOrder} USDT`}
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[9px] font-normal">
                  {s.pair}
                </Badge>
                <Badge variant="secondary" className="text-[9px] font-normal">
                  {s.timeframe}
                </Badge>
                {s.agent.enabled && (
                  <Badge variant="secondary" className="text-[9px] font-normal">
                    {s.agent.skills.filter((k) => k.enabled).length}{" "}
                    项自定义能力
                  </Badge>
                )}
              </div>
              <Separator />
              <div className="mt-3 flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => edit(s)}
                >
                  <Settings2 size={11} />
                  配置
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => {
                    const copy = structuredClone(s);
                    copy.id = crypto.randomUUID();
                    copy.name = `${s.name.slice(0, 32)} 副本`;
                    edit(copy);
                  }}
                >
                  <Copy size={11} />
                  复制
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={`删除策略 ${s.name}`}
                  title={
                    usedIds.includes(s.id) ? "已有机器人使用此策略" : "删除策略"
                  }
                  disabled={usedIds.includes(s.id)}
                  onClick={() => setRemove(s)}
                >
                  <Trash2 size={12} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 gap-1 text-[11px]"
                  onClick={() => onUse(s)}
                >
                  创建机器人
                  <ArrowUpRight size={11} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!shown.length && (
        <div className="rounded-lg border border-dashed py-16 text-center text-xs text-muted-foreground">
          暂无策略，点击上方按钮创建。
        </div>
      )}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="flex max-h-[88dvh] flex-col overflow-hidden sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>
              {strategies.some((s) => s.id === draft?.id)
                ? "配置策略"
                : "新增策略"}
            </DialogTitle>
            <DialogDescription>
              配置保存在本机浏览器。Agent 执行服务待接入。
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <>
              <Tabs
                value={tab}
                onValueChange={setTab}
                className="min-h-0 flex-1 overflow-y-auto pr-1"
              >
                <TabsList className="mb-4 grid w-full grid-cols-4">
                  <TabsTrigger value="base" className="text-xs">
                    基础配置
                  </TabsTrigger>
                  <TabsTrigger value="parameters" className="text-xs">
                    策略参数
                  </TabsTrigger>
                  <TabsTrigger value="agent" className="text-xs">
                    Agent 能力
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs">
                    配置预览
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="base" className="m-0 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="strategy-name" className="text-xs">
                      策略名称
                    </Label>
                    <Input
                      id="strategy-name"
                      maxLength={40}
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                      placeholder="例如：BTC 趋势 Agent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Choice
                      id="strategy-kind"
                      label="策略类型"
                      value={draft.kind}
                      onChange={(v) =>
                        setDraft({
                          ...draft,
                          kind: v as StrategyKind,
                          agent: {
                            ...draft.agent,
                            enabled: v === "agent" ? true : draft.agent.enabled,
                          },
                        })
                      }
                      options={Object.entries(kindNames).map(
                        ([value, label]) => ({ value, label }),
                      )}
                    />
                    <Choice
                      id="strategy-pair"
                      label="交易对"
                      value={draft.pair}
                      onChange={(v) => setDraft({ ...draft, pair: v })}
                      options={pairs.map((value) => ({ value, label: value }))}
                    />
                    <Choice
                      id="strategy-timeframe"
                      label="分析周期"
                      value={draft.timeframe}
                      onChange={(v) => setDraft({ ...draft, timeframe: v })}
                      options={timeframes.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                    {numeric("maxOrder", "单笔上限 · USDT", 1, 1000000)}
                    {numeric("stopLoss", "止损比例 · %", 0.1, 100, 0.1)}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="strategy-description" className="text-xs">
                      描述
                    </Label>
                    <Textarea
                      id="strategy-description"
                      maxLength={300}
                      rows={2}
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                    />
                  </div>
                </TabsContent>
                <TabsContent value="parameters" className="m-0 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {draft.kind === "grid" && (
                      <>
                        {parameter(
                          "lower",
                          "网格下限价格 · USDT",
                          0.000001,
                          100000000,
                          0.01,
                        )}
                        {parameter(
                          "upper",
                          "网格上限价格 · USDT",
                          0.000001,
                          100000000,
                          0.01,
                        )}
                        {parameter("grids", "网格数量", 2, 200)}
                      </>
                    )}
                    {draft.kind === "ema" && (
                      <>
                        {parameter("fast", "快均线周期", 2, 499)}
                        {parameter("slow", "慢均线周期", 3, 500)}
                      </>
                    )}
                    {draft.kind === "dca" && (
                      <>
                        {parameter(
                          "amount",
                          "每次买入 · USDT",
                          1,
                          draft.maxOrder,
                        )}
                        {parameter("interval", "买入间隔 · 分钟", 1, 43200)}
                      </>
                    )}
                    {draft.kind === "agent" && (
                      <div className="col-span-2 rounded-md border p-4 text-xs leading-6 text-muted-foreground">
                        在“Agent
                        能力”中配置模型、分析指令和允许调用的能力。输出固定为结构化交易信号，并受全局风控约束。
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    保存更新后，新创建的机器人使用此版本；现有机器人保留创建时的配置快照。
                  </p>
                </TabsContent>
                <TabsContent value="agent" className="m-0 space-y-4">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label htmlFor="agent-enabled" className="text-xs">
                        启用 Agent 能力
                      </Label>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        可用于独立 Agent 策略或辅助规则策略。
                      </p>
                    </div>
                    <Switch
                      id="agent-enabled"
                      disabled={draft.kind === "agent"}
                      checked={draft.agent.enabled}
                      onCheckedChange={(enabled) =>
                        setDraft({
                          ...draft,
                          agent: { ...draft.agent, enabled },
                        })
                      }
                    />
                  </div>
                  {draft.agent.enabled && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="agent-model" className="text-xs">
                          模型 ID
                        </Label>
                        <Input
                          id="agent-model"
                          maxLength={100}
                          value={draft.agent.model}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              agent: { ...draft.agent, model: e.target.value },
                            })
                          }
                          placeholder="填写模型服务提供的模型 ID"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="agent-instructions" className="text-xs">
                          Agent 分析指令
                        </Label>
                        <Textarea
                          id="agent-instructions"
                          rows={4}
                          maxLength={6000}
                          value={draft.agent.instructions}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              agent: {
                                ...draft.agent,
                                instructions: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="agent-confidence" className="text-xs">
                            最低信号置信度 · 0–1
                          </Label>
                          <Input
                            id="agent-confidence"
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={draft.agent.confidence}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                agent: {
                                  ...draft.agent,
                                  confidence: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="agent-timeout" className="text-xs">
                            分析超时 · 秒
                          </Label>
                          <Input
                            id="agent-timeout"
                            type="number"
                            min="5"
                            max="120"
                            value={draft.agent.timeout}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                agent: {
                                  ...draft.agent,
                                  timeout: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {capabilityOptions.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-2 rounded-md border p-3"
                          >
                            <div>
                              <Label
                                htmlFor={`cap-${c.id}`}
                                className="text-xs"
                              >
                                {c.name}
                              </Label>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {c.description}
                              </p>
                            </div>
                            <Switch
                              id={`cap-${c.id}`}
                              checked={draft.agent.capabilities.includes(c.id)}
                              disabled={c.id === "signal.propose"}
                              onCheckedChange={(on) =>
                                setDraft({
                                  ...draft,
                                  agent: {
                                    ...draft.agent,
                                    capabilities: on
                                      ? [...draft.agent.capabilities, c.id]
                                      : draft.agent.capabilities.filter(
                                          (id) => id !== c.id,
                                        ),
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">自定义能力项</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={draft.agent.skills.length >= 12}
                          className="h-7 gap-1 text-[11px]"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              agent: {
                                ...draft.agent,
                                skills: [
                                  ...draft.agent.skills,
                                  {
                                    id: crypto.randomUUID(),
                                    name: "",
                                    instructions: "",
                                    enabled: true,
                                  },
                                ],
                              },
                            })
                          }
                        >
                          <Plus size={12} />
                          添加能力
                        </Button>
                      </div>
                      <Accordion
                        type="multiple"
                        className="rounded-md border px-3"
                      >
                        {draft.agent.skills.map((skill, index) => (
                          <AccordionItem value={skill.id} key={skill.id}>
                            <AccordionTrigger className="py-3 text-xs">
                              {skill.name || `新能力 ${index + 1}`}
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3">
                              <div className="grid gap-2">
                                <Label
                                  htmlFor={`skill-name-${skill.id}`}
                                  className="text-xs"
                                >
                                  能力名称
                                </Label>
                                <Input
                                  id={`skill-name-${skill.id}`}
                                  value={skill.name}
                                  maxLength={40}
                                  placeholder="例如：趋势研判、异常波动过滤"
                                  onChange={(e) =>
                                    setDraft({
                                      ...draft,
                                      agent: {
                                        ...draft.agent,
                                        skills: draft.agent.skills.map((s) =>
                                          s.id === skill.id
                                            ? { ...s, name: e.target.value }
                                            : s,
                                        ),
                                      },
                                    })
                                  }
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label
                                  htmlFor={`skill-instructions-${skill.id}`}
                                  className="text-xs"
                                >
                                  能力指令
                                </Label>
                                <Textarea
                                  id={`skill-instructions-${skill.id}`}
                                  rows={3}
                                  value={skill.instructions}
                                  maxLength={2000}
                                  placeholder="描述数据依据、分析步骤和判断条件"
                                  onChange={(e) =>
                                    setDraft({
                                      ...draft,
                                      agent: {
                                        ...draft.agent,
                                        skills: draft.agent.skills.map((s) =>
                                          s.id === skill.id
                                            ? {
                                                ...s,
                                                instructions: e.target.value,
                                              }
                                            : s,
                                        ),
                                      },
                                    })
                                  }
                                />
                              </div>
                              <div className="flex justify-between">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={`skill-enabled-${skill.id}`}
                                    aria-label={`启用能力 ${skill.name || index + 1}`}
                                    checked={skill.enabled}
                                    onCheckedChange={(enabled) =>
                                      setDraft({
                                        ...draft,
                                        agent: {
                                          ...draft.agent,
                                          skills: draft.agent.skills.map((s) =>
                                            s.id === skill.id
                                              ? { ...s, enabled }
                                              : s,
                                          ),
                                        },
                                      })
                                    }
                                  />
                                  <Label
                                    htmlFor={`skill-enabled-${skill.id}`}
                                    className="text-xs"
                                  >
                                    启用
                                  </Label>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() =>
                                    setDraft({
                                      ...draft,
                                      agent: {
                                        ...draft.agent,
                                        skills: draft.agent.skills.filter(
                                          (s) => s.id !== skill.id,
                                        ),
                                      },
                                    })
                                  }
                                >
                                  移除能力
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      {!draft.agent.skills.length && (
                        <p className="text-[11px] text-muted-foreground">
                          可添加趋势研判、波动过滤等能力指令。
                        </p>
                      )}
                    </>
                  )}
                </TabsContent>
                <TabsContent value="preview" className="m-0 space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Code2 size={14} />
                    机器人将保存此配置快照
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-[10px] leading-5">
                    {JSON.stringify(draft, null, 2)}
                  </pre>
                  {draft.agent.enabled && (
                    <div className="text-[11px] text-muted-foreground">
                      信号格式：
                      {`{ action: "buy" | "sell" | "hold", symbol, confidence, reason }`}
                      。能力项为分析指令配置，不会安装插件或直接执行订单。
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              {errors.length > 0 && (
                <div
                  role="alert"
                  className="max-h-24 overflow-auto rounded border border-destructive/30 p-2 text-xs text-destructive"
                >
                  {errors.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              )}
              <div className="flex shrink-0 justify-end gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft(null)}
                >
                  取消
                </Button>
                <Button size="sm" onClick={save}>
                  保存策略
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除策略“{remove?.name}”？</AlertDialogTitle>
            <AlertDialogDescription>
              删除此浏览器中保存的策略配置。正在被机器人使用的策略不可删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (remove && !usedIds.includes(remove.id)) onDelete(remove.id);
                setRemove(null);
              }}
            >
              删除策略
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
