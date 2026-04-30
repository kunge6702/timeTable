# POSTGRAD OPS

一个本地优先的考研项目管理 SPA。它把 L0 学科、L1 模块、L2 宏观任务、L3 原子任务放进同一个轻量系统里，用今日执行台处理每天的动作，用战略规划台做四科并行排期沙盘和 deadline 碰撞检测。

## 功能

- 今日看板：快速录入 L3 原子任务，绑定 L0/L1/L2，记录预期效果和 Error Tracking。
- 战略规划：维护 L2 宏观任务 backlog，支持拖拽调整顺序、修改预估任务日、标记完成。
- 四科并行：数学、英语、政治、408 是四条固定通道，每天各推进 1 个当前 L2。
- 热力图：每个未来日期固定分成 4 个象限，每门科目占一个 1/4 格子。
- 大限告警：以 `2026-12-19` 为初试警戒线，越界的科目通道会在热力图中标红。
- 本地持久化：使用 Zustand + localStorage，数据保存在当前浏览器。

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- lucide-react

## 本地运行

```bash
npm install
npm run dev
```

构建检查：

```bash
npm run build
npm run lint
```

## 排期模型

核心类型在 `src/types.ts`：

- `SubjectDefinition`：L0 学科和 L1 模块目录
- `MacroTask`：L2 宏观任务，含预估任务日、排序、完成状态
- `MicroTask`：L3 原子任务，含当日日期、Outcome、复盘备注
- `HeatmapCell`：热力图格点，含历史完成率、四科分配表和越界科目

排期引擎在 `src/utils/schedule.ts`。它从明天开始按科目独立排队：同一科目内部按 `MacroTask.order` 串行推进，不同科目之间每天并行推进。

例子：数学一有 5 个任务，每个任务 5 天，数学通道需要 25 个自然日；408 有 6 个任务，每个任务 5 天，408 通道需要 30 个自然日。因为它们分别占每天格子的 1/4，并不是互相抢同一个整天，所以整体完工日期取四科通道的最大值，也就是约 30 天，而不是 55 天。
