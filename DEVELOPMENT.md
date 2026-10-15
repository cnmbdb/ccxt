# 本机 Docker 开发

```bash
docker compose -f compose.dev.yaml up -d --build
docker compose -f compose.dev.yaml logs -f dev
docker compose -f compose.dev.yaml down
```

打开 http://127.0.0.1:8000 。页面是基于 Next.js、Tailwind CSS 和官方 shadcn/ui 组件实现的 Quant 交易机器人管理后台。

`docs/playground/` 挂载到容器 `/app`，Next.js dev 使用轮询监听文件，组件和样式修改后触发 Fast Refresh。依赖与 `.next` 缓存保存在 Docker 命名卷中。

后台支持总览、机器人配置创建和搜索、模拟启停、策略模板、订单空状态、账户名称、风控参数、系统设置及黑白主题。配置通过 localStorage 保存在当前浏览器；交易所、策略调度与订单执行尚未接入，净值图是示例数据。原有执行 API 保留，仅支持 TypeScript，使用 lockfile 安装的 npm CCXT。修改根目录 `ts/src/` 不会自动替换此依赖。本配置仅用于个人本机开发。

更新依赖后重新构建并刷新开发依赖卷（会清空 Next 缓存）：

```bash
docker compose -f compose.dev.yaml down -v
docker compose -f compose.dev.yaml up -d --build
```

GitNexus 已对 `docs/playground` 建立名为 `ccxt-playground` 的独立索引；这是开发页面的范围，不代表整个多语言仓库。

```bash
gitnexus analyze docs/playground --skip-git --index-only --name ccxt-playground
gitnexus context runTs --repo ccxt-playground
gitnexus impact runTs --direction upstream --repo ccxt-playground
```
