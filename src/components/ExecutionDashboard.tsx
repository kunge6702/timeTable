import { CheckCircle2, ChevronDown, ChevronUp, Circle, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { EXAM_DEADLINE, getModulesForSubject, getSubjectLookup } from '../data/catalog'
import { usePlannerStore } from '../store/plannerStore'
import type { SubjectId } from '../types'
import { addDaysISO, compareISO, formatZhDate, getTodayISO } from '../utils/date'
import { buildSchedule } from '../utils/schedule'
import { getModuleName, getSubjectInlineStyle, getSubjectName } from '../utils/subjectView'
import { Heatmap } from './Heatmap'
import { HistoricalBoardDialog } from './HistoricalBoardDialog'
import { TaskBacklogQueue } from './TaskBacklogQueue'

export function ExecutionDashboard() {
  const today = getTodayISO()
  const subjects = usePlannerStore((state) => state.subjects)
  const macroTasks = usePlannerStore((state) => state.macroTasks)
  const microTasks = usePlannerStore((state) => state.microTasks)
  const addMicroTask = usePlannerStore((state) => state.addMicroTask)
  const updateMicroTask = usePlannerStore((state) => state.updateMicroTask)
  const toggleMicroTask = usePlannerStore((state) => state.toggleMicroTask)
  const deleteMicroTask = usePlannerStore((state) => state.deleteMicroTask)
  const backlogTasks = usePlannerStore((state) => state.backlogTasks)
  const addBacklogTask = usePlannerStore((state) => state.addBacklogTask)
  const completeBacklogTask = usePlannerStore((state) => state.completeBacklogTask)
  const revertBacklogTask = usePlannerStore((state) => state.revertBacklogTask)

  const defaultSubjectId = subjects[0]?.id ?? ''
  const defaultModuleId = subjects[0]?.modules[0]?.id ?? ''
  const [title, setTitle] = useState('')
  const [outcome, setOutcome] = useState('')
  const [subjectId, setSubjectId] = useState<SubjectId>(defaultSubjectId)
  const [moduleId, setModuleId] = useState(defaultModuleId)
  const [macroTaskId, setMacroTaskId] = useState('')
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set())
  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const [lastCompletedBacklogTaskId, setLastCompletedBacklogTaskId] = useState<string | null>(null)

  const subjectLookup = useMemo(() => getSubjectLookup(subjects), [subjects])
  const activeSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? subjects[0],
    [subjectId, subjects],
  )
  const activeSubjectId = activeSubject?.id ?? ''
  const subjectModules = useMemo(
    () => (activeSubjectId ? getModulesForSubject(activeSubjectId, subjects) : []),
    [activeSubjectId, subjects],
  )
  const activeModuleId = subjectModules.some((module) => module.id === moduleId)
    ? moduleId
    : subjectModules[0]?.id ?? ''

  const filteredMacros = useMemo(
    () =>
      macroTasks
        .filter((task) => task.subjectId === activeSubjectId && task.moduleId === activeModuleId)
        .sort((left, right) => left.order - right.order),
    [activeModuleId, activeSubjectId, macroTasks],
  )
  const activeMacroTaskId = filteredMacros.some((task) => task.id === macroTaskId)
    ? macroTaskId
    : ''

  const todaysTasks = useMemo(
    () =>
      microTasks
        .filter((task) => task.date === today)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [microTasks, today],
  )

  const doneCount = todaysTasks.filter((task) => task.completed).length
  const completionRate =
    todaysTasks.length === 0 ? 0 : Math.round((doneCount / todaysTasks.length) * 100)
  const openBacklogTasks = useMemo(
    () =>
      backlogTasks.filter(
        (task) => !task.completed && (!task.availableDate || compareISO(task.availableDate, today) <= 0),
      ),
    [backlogTasks, today],
  )
  const recentlyCompletedBacklogTask = useMemo(
    () =>
      lastCompletedBacklogTaskId
        ? backlogTasks.find((task) => task.id === lastCompletedBacklogTaskId)
        : undefined,
    [backlogTasks, lastCompletedBacklogTaskId],
  )
  const warmupCompletedDates = useMemo(
    () =>
      new Set(
        backlogTasks
          .map((task) => (task.completed ? task.completedDate : undefined))
          .filter((date): date is string => Boolean(date)),
      ),
    [backlogTasks],
  )
  const scheduleSummary = useMemo(
    () => buildSchedule(subjects, macroTasks, microTasks, today, EXAM_DEADLINE, warmupCompletedDates),
    [macroTasks, microTasks, subjects, today, warmupCompletedDates],
  )

  const handleSubjectChange = (nextSubjectId: SubjectId) => {
    const nextModuleId = getModulesForSubject(nextSubjectId, subjects)[0]?.id ?? ''
    setSubjectId(nextSubjectId)
    setModuleId(nextModuleId)
    setMacroTaskId('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !activeSubjectId || !activeModuleId) return

    addMicroTask({
      date: today,
      title: trimmedTitle,
      outcome: outcome.trim(),
      reviewNote: '',
      subjectId: activeSubjectId,
      moduleId: activeModuleId,
      macroTaskId: activeMacroTaskId || undefined,
    })

    setTitle('')
    setOutcome('')
  }

  const toggleExpandedTask = (taskId: string) => {
    setExpandedTaskIds((current) => {
      const next = new Set(current)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const handleToggleTask = (taskId: string, willComplete: boolean) => {
    toggleMicroTask(taskId)
    if (!willComplete) return
    setExpandedTaskIds((current) => new Set(current).add(taskId))
  }

  const handleBacklogTaskComplete = (taskId: string) => {
    completeBacklogTask(taskId, today)
    setLastCompletedBacklogTaskId(taskId)
  }

  const handleBacklogTaskUndo = (taskId: string) => {
    revertBacklogTask(taskId)
    setLastCompletedBacklogTaskId(null)
  }

  const handleQuickBacklogAdd = (taskTitle: string) => {
    addBacklogTask({
      title: taskTitle,
      source: 'Quick Add',
      availableDate: today,
    })
  }

  const getReviewBacklogTitle = (reviewNote: string) =>
    reviewNote.trim().split(/\r?\n/)[0]?.slice(0, 80).trim() ?? ''

  const handleReviewBacklogAdd = (taskId: string) => {
    const task = todaysTasks.find((item) => item.id === taskId)
    if (!task) return

    const backlogTitle = getReviewBacklogTitle(task.reviewNote)
    if (!backlogTitle) return

    const backlogSource = `来自 L3: ${task.title}`
    const alreadyCaptured = backlogTasks.some(
      (item) => item.title === backlogTitle && item.source === backlogSource && !item.completed,
    )
    if (alreadyCaptured) return

    addBacklogTask({
      subjectId: task.subjectId,
      moduleId: task.moduleId,
      macroTaskId: task.macroTaskId,
      title: backlogTitle,
      source: backlogSource,
      availableDate: addDaysISO(today, 1),
    })
  }

  return (
    <section className="workbench execution-workbench">
      <div className="execution-head">
        <div>
          <p className="eyebrow">Execution Dashboard</p>
          <h1>今日看板</h1>
        </div>
        <div className="today-meter" aria-label="今日完成率">
          <span>{formatZhDate(today)}</span>
          <strong>{completionRate}%</strong>
          <small>
            {doneCount}/{todaysTasks.length} L3
          </small>
        </div>
      </div>

      <div className="execution-layout">
        <div className="execution-main-column">
      <section className="execution-heatmap-hero">
        <div className="execution-heatmap-copy">
          <div>
            <p className="eyebrow">Channel Heat</p>
            <h2>四科通道热力排期</h2>
          </div>
        </div>
        <div className="execution-heatmap-main">
          <div className="execution-heatmap-map">
            <Heatmap
              cells={scheduleSummary.cells}
              subjects={subjects}
              onPastDateClick={setHistoryDate}
            />
          </div>
          <div className="execution-heatmap-stats">
            <span>
              <strong>{scheduleSummary.scheduledTaskCount}</strong>
              未完成 L2
            </span>
            <span>
              <strong>{scheduleSummary.totalWorkUnits}</strong>
              任务日
            </span>
            <span className={scheduleSummary.overflowDays > 0 ? 'danger' : 'stable'}>
              <strong>{scheduleSummary.overflowDays}</strong>
              越界天
            </span>
          </div>
        </div>
      </section>

      <form className="quick-entry" onSubmit={handleSubmit}>
        <label className="field main-input">
          <span>L3 原子任务</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：硬算 3 道综合题，扫出泰勒公式盲区"
          />
        </label>

        <label className="field">
          <span>L0</span>
          <select
            value={activeSubjectId}
            onChange={(event) => handleSubjectChange(event.target.value)}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>L1</span>
          <select
            value={activeModuleId}
            onChange={(event) => {
              setModuleId(event.target.value)
              setMacroTaskId('')
            }}
          >
            {subjectModules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>L2</span>
          <select
            value={activeMacroTaskId}
            onChange={(event) => setMacroTaskId(event.target.value)}
          >
            <option value="">未绑定</option>
            {filteredMacros.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>

        <label className="field outcome-field">
          <span>Outcome</span>
          <textarea
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            placeholder="晚上复盘时用它校验是否真的闭环"
          />
        </label>

        <button className="primary-button" type="submit" title="写入今日">
          <Plus size={18} />
          写入今日
        </button>
      </form>

      <div className="task-stack">
        {todaysTasks.length === 0 ? (
          <div className="empty-state">今日尚未装载 L3</div>
        ) : (
          todaysTasks.map((task) => {
            const macro = macroTasks.find((item) => item.id === task.macroTaskId)
            const isExpanded = expandedTaskIds.has(task.id)
            const reviewBacklogTitle = getReviewBacklogTitle(task.reviewNote)
            const reviewBacklogSource = `来自 L3: ${task.title}`
            const isReviewCaptured = backlogTasks.some(
              (item) =>
                item.title === reviewBacklogTitle &&
                item.source === reviewBacklogSource &&
                !item.completed,
            )
            return (
              <article
                className={`micro-task ${task.completed ? 'is-done' : ''} ${
                  isExpanded ? 'is-expanded' : ''
                }`}
                key={task.id}
              >
                <button
                  className="icon-check"
                  onClick={() => handleToggleTask(task.id, !task.completed)}
                  type="button"
                  title={task.completed ? '标记未完成' : '标记完成'}
                >
                  {task.completed ? <CheckCircle2 /> : <Circle />}
                </button>
                <div className="micro-main">
                  <div className="micro-summary">
                    <input
                      className="micro-title"
                      value={task.title}
                      onChange={(event) =>
                        updateMicroTask(task.id, { title: event.target.value })
                      }
                    />
                    <div className="path-line">
                      <span
                        className="subject-pill"
                        style={getSubjectInlineStyle(task.subjectId, subjects)}
                      >
                        {subjectLookup[task.subjectId]?.name ??
                          getSubjectName(task.subjectId, subjects)}
                      </span>
                      <span>{getModuleName(task.moduleId, subjects)}</span>
                      {macro ? <span>{macro.title}</span> : null}
                    </div>
                    <button
                      className="micro-expand"
                      type="button"
                      onClick={() => toggleExpandedTask(task.id)}
                      aria-expanded={isExpanded}
                      title={isExpanded ? '收起复盘区' : '展开复盘区'}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                  <div className="feedback-grid" hidden={!isExpanded}>
                    <label>
                      <span>预期效果</span>
                      <textarea
                        value={task.outcome}
                        onChange={(event) =>
                          updateMicroTask(task.id, { outcome: event.target.value })
                        }
                      />
                    </label>
                    <div className="feedback-field">
                      <div className="feedback-field__head">
                        <span>Error Tracking</span>
                        <button
                          className={`backlog-capture-button ${
                            isReviewCaptured ? 'is-captured' : ''
                          }`}
                          disabled={!reviewBacklogTitle || isReviewCaptured}
                          onClick={() => handleReviewBacklogAdd(task.id)}
                          type="button"
                          title={
                            isReviewCaptured
                              ? '已移入 Backlog'
                              : reviewBacklogTitle
                                ? '移入 Backlog'
                                : '先写错因'
                          }
                        >
                          <Plus size={14} />
                          {isReviewCaptured ? '已入 Backlog' : reviewBacklogTitle ? '移入 Backlog' : '先写错因'}
                        </button>
                      </div>
                      <textarea
                        aria-label="Error Tracking"
                        value={task.reviewNote}
                        onChange={(event) =>
                          updateMicroTask(task.id, { reviewNote: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <button
                  className="ghost-icon"
                  onClick={() => deleteMicroTask(task.id)}
                  type="button"
                  title="删除任务"
                >
                  <Trash2 size={18} />
                </button>
              </article>
            )
          })
        )}
      </div>
        </div>

        <TaskBacklogQueue
          tasks={openBacklogTasks}
          subjects={subjects}
          recentlyCompletedTask={recentlyCompletedBacklogTask}
          onQuickAdd={handleQuickBacklogAdd}
          onTaskComplete={handleBacklogTaskComplete}
          onUndoTask={handleBacklogTaskUndo}
        />
      </div>

      <HistoricalBoardDialog
        open={historyDate !== null}
        date={historyDate}
        subjects={subjects}
        macroTasks={macroTasks}
        microTasks={microTasks}
        onClose={() => setHistoryDate(null)}
      />
    </section>
  )
}
