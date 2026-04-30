import {
  Check,
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  EXAM_DEADLINE,
  getModulesForSubject,
  moduleById,
  subjectById,
} from '../data/catalog'
import { usePlannerStore } from '../store/plannerStore'
import type { SubjectId } from '../types'
import { formatZhDate, getTodayISO } from '../utils/date'
import { buildSchedule } from '../utils/schedule'
import { Heatmap } from './Heatmap'

const defaultSubject: SubjectId = 'math'

const clampTaskDays = (value: number) =>
  Number.isFinite(value) ? Math.min(240, Math.max(1, Math.round(value))) : 1

export function StrategicPlanner() {
  const macroTasks = usePlannerStore((state) => state.macroTasks)
  const microTasks = usePlannerStore((state) => state.microTasks)
  const addMacroTask = usePlannerStore((state) => state.addMacroTask)
  const updateMacroTask = usePlannerStore((state) => state.updateMacroTask)
  const deleteMacroTask = usePlannerStore((state) => state.deleteMacroTask)
  const toggleMacroTask = usePlannerStore((state) => state.toggleMacroTask)
  const reorderMacroTask = usePlannerStore((state) => state.reorderMacroTask)
  const resetDemoData = usePlannerStore((state) => state.resetDemoData)

  const [title, setTitle] = useState('')
  const [days, setDays] = useState(6)
  const [subjectId, setSubjectId] = useState<SubjectId>(defaultSubject)
  const [moduleId, setModuleId] = useState(
    getModulesForSubject(defaultSubject)[0].id,
  )
  const [dragId, setDragId] = useState<string | null>(null)

  const today = getTodayISO()
  const summary = useMemo(
    () => buildSchedule(macroTasks, microTasks, today, EXAM_DEADLINE),
    [macroTasks, microTasks, today],
  )
  const orderedTasks = [...macroTasks].sort((left, right) => left.order - right.order)
  const closedTasks = orderedTasks.filter((task) => task.completed).length

  const handleSubjectChange = (nextSubjectId: SubjectId) => {
    setSubjectId(nextSubjectId)
    setModuleId(getModulesForSubject(nextSubjectId)[0].id)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    addMacroTask({
      title: trimmedTitle,
      subjectId,
      moduleId,
      estimatedDays: clampTaskDays(days),
      notes: '',
    })

    setTitle('')
    setDays(6)
  }

  const summaryTone = summary.overflowDays > 0 ? 'danger' : 'stable'

  return (
    <section className="workbench strategy-workbench">
      <div className="strategy-topline">
        <div>
          <p className="eyebrow">Strategic Planning View</p>
          <h1>上帝视角</h1>
        </div>
        <div className={`deadline-panel ${summaryTone}`}>
          <TriangleAlert size={20} />
          <div>
            <span>预计收束</span>
            <strong>{formatZhDate(summary.finishDate)}</strong>
          </div>
          <div>
            <span>越界</span>
            <strong>{summary.overflowDays} 天</strong>
          </div>
          <div>
            <span>科目通道</span>
            <strong>4 条/日</strong>
          </div>
          <div>
            <span>大限</span>
            <strong>{EXAM_DEADLINE}</strong>
          </div>
        </div>
      </div>

      <div className="strategy-layout">
        <aside className="backlog-panel">
          <form className="macro-entry" onSubmit={handleSubmit}>
            <label className="field">
              <span>L2 宏观任务</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：408 操作系统同步互斥专题"
              />
            </label>
            <div className="inline-fields">
              <label className="field">
                <span>L0</span>
                <select
                  value={subjectId}
                  onChange={(event) =>
                    handleSubjectChange(event.target.value as SubjectId)
                  }
                >
                  {Object.values(subjectById).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>L1</span>
                <select
                  value={moduleId}
                  onChange={(event) => setModuleId(event.target.value)}
                >
                  {getModulesForSubject(subjectId).map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field days-field">
                <span>任务日</span>
                <input
                  min={1}
                  max={180}
                  type="number"
                  value={days}
                  onChange={(event) =>
                    setDays(clampTaskDays(Number(event.target.value)))
                  }
                />
              </label>
            </div>
            <div className="lane-explain">
              <strong>四科固定通道</strong>
              <span>每天数学、英语、政治、408 各推进 1 个当前 L2；单科内部按 order 串行。</span>
            </div>
            <button className="primary-button" type="submit" title="新增宏观任务">
              <Plus size={18} />
              新增 L2
            </button>
          </form>

          <div className="backlog-meta">
            <span>{summary.scheduledTaskCount} 个未完成 L2</span>
            <span>{summary.totalWorkUnits} 个任务日</span>
            <span>{summary.plannedCalendarDays} 个自然日</span>
            <span>{closedTasks} 个已收束</span>
          </div>

          <div className="subject-stats">
            {summary.subjectStats.map((stat) => (
              <div className="subject-stat" key={stat.subjectId}>
                <span className={`subject-pill subject-${stat.subjectId}`}>
                  {subjectById[stat.subjectId].name}
                </span>
                <strong>{stat.plannedCalendarDays} 天</strong>
                <small>
                  {stat.taskCount} 个 L2 / {stat.totalWorkUnits} 个任务日
                </small>
              </div>
            ))}
          </div>

          <div className="macro-list">
            {orderedTasks.map((task) => (
              <article
                key={task.id}
                className={`macro-item ${task.completed ? 'is-complete' : ''} ${
                  dragId === task.id ? 'is-dragging' : ''
                }`}
                draggable
                onDragStart={() => setDragId(task.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragId) reorderMacroTask(dragId, task.id)
                  setDragId(null)
                }}
              >
                <GripVertical className="drag-handle" size={18} aria-hidden="true" />
                <button
                  className="complete-toggle"
                  onClick={() => toggleMacroTask(task.id)}
                  type="button"
                  title={task.completed ? '重新进入排期' : '标记完成'}
                >
                  {task.completed ? <Check size={16} /> : null}
                </button>
                <div className="macro-body">
                  <input
                    value={task.title}
                    onChange={(event) =>
                      updateMacroTask(task.id, { title: event.target.value })
                    }
                  />
                  <div className="path-line">
                    <span className={`subject-pill subject-${task.subjectId}`}>
                      {subjectById[task.subjectId].name}
                    </span>
                    <span>{moduleById[task.moduleId]?.name ?? '未归档'}</span>
                  </div>
                </div>
                <input
                  className="day-input"
                  min={1}
                  max={240}
                  type="number"
                  value={task.estimatedDays}
                  onChange={(event) =>
                    updateMacroTask(task.id, {
                      estimatedDays: clampTaskDays(Number(event.target.value)),
                    })
                  }
                  aria-label={`${task.title} 预估任务日`}
                />
                <button
                  className="ghost-icon"
                  onClick={() => deleteMacroTask(task.id)}
                  type="button"
                  title="删除宏观任务"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>

          <button className="text-button" type="button" onClick={resetDemoData}>
            <RotateCcw size={16} />
            重置样例
          </button>
        </aside>

        <div className="heatmap-panel">
          <div className="heatmap-toolbar">
            <div>
              <p className="eyebrow">Deadline Collision Map</p>
              <h2>四科通道热力排期</h2>
            </div>
            <div className="legend">
              <span><i className="legend-empty" />历史空转</span>
              <span><i className="legend-green" />完成闭环</span>
              <span><i className="legend-plan" />科目 1/4 占用</span>
              <span><i className="legend-red" />通道越界</span>
            </div>
          </div>

          <Heatmap cells={summary.cells} />

          <div className="wall-strip">
            <span>Σ 四科任务日 = {summary.totalWorkUnits}</span>
            <span>
              完工自然日 = max(数学, 英语, 政治, 408) = {summary.plannedCalendarDays} 天
            </span>
            <span>距离警戒线 {summary.daysUntilDeadline} 天</span>
            <span className={summaryTone}>
              {summary.overflowDays > 0
                ? '最长科目通道已撞线，优先压缩该科任务日'
                : '四科通道仍在边界内'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
