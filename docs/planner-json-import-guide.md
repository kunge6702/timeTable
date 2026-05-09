# POSTGRAD OPS JSON 导入说明

这个文档是给 AI 用的。先把你的需求写给 AI，再要求它只输出符合下面结构的 JSON 文件，然后在应用里点「一键导入」即可。

导入时可以在界面里选「覆盖当前数据」或「追加到现有数据」。文件导入和粘贴导入只是两种输入方式，JSON 内容本身不需要为这两种方式分别改写。

当前版本支持动态 `L0/L1`：
- `subjects` 用来描述全部 L0 学科和每个学科下的 L1 模块
- `macroTasks` / `microTasks` 通过 `subjectId`、`moduleId` 和目录关联

L2 级任务一定要把 `title` 和 `detail` 分开写：
- `title` 只放短标题，适合列表显示。
- `detail` 放完整说明、步骤、关键词和错因分析。
- 不要把长说明塞进 `title`，否则界面会显示很挤，`detail` 也会空掉。

一键导出会直接把当前数据下载成同结构 JSON，可以拿去备份、迁移，或再交给 AI 做二次修改。

自动备份会在浏览器本地保留最近几份快照，但它依然不是云存储，建议仍然定期导出 JSON。

## 导入模式

- `覆盖当前数据`：清空本地内容后导入整包 JSON。
- `追加到现有数据`：保留本地内容，把新任务并入现有数据。

## 顶层结构

```json
{
  "version": 1,
  "view": "strategy",
  "subjects": [],
  "macroTasks": [],
  "microTasks": []
}
```

## 字段规则

### `version`
- 固定写 `1`

### `view`
- 可选值：`execution`、`strategy`
- 不写时默认 `execution`

### `subjects`
- 全部 L0/L1 目录
- 每个 L0 至少建议包含：`id`、`name`、`shortName`、`color`、`modules`
- 每个 L1 至少建议包含：`id`、`subjectId`、`name`

### `macroTasks`
- 宏任务数组
- 必填字段：`subjectId`、`moduleId`、`title`、`estimatedDays`
- 推荐字段：`id`、`detail`、`startDate`、`order`、`completed`、`dependencies`、`notes`
- L2 宏任务请保持 `title` 简短，详细内容统一写到 `detail`

### `microTasks`
- 原子任务数组
- 必填字段：`date`、`subjectId`、`moduleId`、`title`
- 推荐字段：`id`、`macroTaskId`、`outcome`、`reviewNote`、`completed`

## 推荐给 AI 的提示词

把下面这段发给 AI，再把你的需求补在后面：

```text
你是 POSTGRAD OPS 的 JSON 生成器。请只输出纯 JSON，不要解释，不要 Markdown，不要代码块。

要求：
1. 顶层结构必须包含 version、view、subjects、macroTasks、microTasks。
2. version 固定为 1。
3. subjects 用来描述全部 L0 和 L1。
4. macroTasks 和 microTasks 必须引用 subjects 中已经存在的 subjectId 和 moduleId。
5. 所有日期使用 YYYY-MM-DD。
6. L2 宏任务的 title 只写短标题，详细说明统一写进 detail。
7. 如果 microTask 需要关联某个 macroTask，请让 microTask.macroTaskId 与 macroTask.id 完全一致。
8. 请根据我的需求生成一份可直接导入的完整 JSON。

我的需求是：
```

## 示例

```json
{
  "version": 1,
  "view": "strategy",
  "subjects": [
    {
      "id": "math",
      "name": "数学一",
      "shortName": "Math",
      "color": "#0d7a53",
      "modules": [
        { "id": "gaoshu", "subjectId": "math", "name": "高数" },
        { "id": "xiandai", "subjectId": "math", "name": "线代" }
      ]
    }
  ],
  "macroTasks": [
    {
      "id": "math-hs-01",
      "subjectId": "math",
      "moduleId": "gaoshu",
      "title": "极限与连续",
      "detail": "复习夹逼定理、极限定义、泰勒展开",
      "estimatedDays": 4,
      "startDate": "2026-05-02",
      "order": 1,
      "completed": false,
      "dependencies": [],
      "notes": ""
    }
  ],
  "microTasks": [
    {
      "id": "micro-001",
      "date": "2026-05-01",
      "subjectId": "math",
      "moduleId": "gaoshu",
      "macroTaskId": "math-hs-01",
      "title": "做 3 道极限题",
      "outcome": "完成后输出易错点",
      "reviewNote": "",
      "completed": false
    }
  ]
}
```

## L2 写法示例

```json
{
  "title": "极限与连续",
  "detail": "夹逼定理、等价无穷小、泰勒展开、未定式处理。"
}
```
