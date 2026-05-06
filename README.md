# POSTGRAD OPS

一个本地优先的考研任务规划 SPA。它把 `L0 学科`、`L1 模块`、`L2 宏观任务`、`L3 原子任务` 放进同一套轻量系统里，方便你按天执行、按学科排期，并用热力图观察整体进度。

## 功能

- 今日看板：快速录入和维护当天的 `L3` 原子任务。
- 战略规划：维护 `L2` 宏观任务 backlog，支持排序、排期、标记完成。
- 四科并行：数学、英语、政治、`408` 分通道推进。
- 热力图：按日期展示完成度、学科占用和 deadline 风险。
- 本地持久化：使用 Zustand + `localStorage`，数据保存在当前浏览器。
- JSON 导入导出：支持一键导入 AI 生成的计划，也支持导出备份。

## 技术栈

- React 19
- TypeScript
- Vite 8
- Zustand
- `@dnd-kit/*`
- `lucide-react`

## 环境要求

- Node.js：推荐 `22.12+`，最低满足 Vite 官方要求的 `20.19+`
- npm：随 Node.js 安装即可
- 不需要额外环境变量

先确认本机版本：

```bash
node -v
npm -v
```

如果 `node -v` 低于 `20.19.0`，先升级 Node.js 再安装依赖。

## 本地运行

```bash
npm install
npm run dev
```

默认访问地址通常是：

```text
http://127.0.0.1:5173/
```

## 构建与检查

```bash
npm run build
npm run lint
```

## 常见问题

### 1. `You are using Node.js 20.14.0...`

这是 Vite 8 的版本提示，不是业务代码报错。解决方式是把 Node.js 升级到：

- `20.19.0` 或更高
- 或 `22.12.0` 或更高

### 2. Windows 下启动时报 `spawn EPERM`

如果是在受限终端、IDE 沙箱或特殊权限环境里运行，Vite 可能无法正常拉起子进程。优先在本机常规终端里执行：

```bash
npm run dev
npm run build
```

### 3. 是否需要重新安装依赖

需要。尤其是在以下情况：

- 升级了 Node.js 版本
- 切换过项目依赖
- 删除过 `node_modules`

重新安装即可：

```bash
npm install
```

## 排期模型

核心类型位于 `src/types.ts`：

- `SubjectDefinition`：L0 学科与 L1 模块目录
- `MacroTask`：L2 宏观任务，包含预估天数、顺序、完成状态等
- `MicroTask`：L3 原子任务，包含日期、结果、复盘备注等
- `HeatmapCell`：热力图格点，包含完成率、学科分配和越界状态

排期引擎位于 `src/utils/schedule.ts`。它会从次日开始，按学科分别排队：同一学科内部按 `MacroTask.order` 串行推进，不同学科之间并行推进。

## JSON 导入说明

导入说明见：

- [docs/planner-json-import-guide.md](docs/planner-json-import-guide.md)

## GitHub Pages 部署

- 本项目已配置为部署到 `https://kunge6702.github.io/timeTable/`
- 推送到 `main` 分支会自动触发 GitHub Pages 工作流
- `deploy/github-pages` 分支可用于准备和验证部署配置，再合并到 `main`
- 首次启用时，请在 GitHub 仓库设置里将 `Pages` 的 `Source` 设为 `GitHub Actions`
