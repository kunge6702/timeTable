import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  DragEndEvent,
  DragStartEvent,
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS as DndCSS } from '@dnd-kit/utilities'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent } from 'react'
import { EXAM_DEADLINE, getModulesForSubject } from '../data/catalog'
import { usePlannerStore } from '../store/plannerStore'
import type { MacroTask, SubjectDefinition, SubjectId } from '../types'
import { addDaysISO, formatZhDate, getTodayISO } from '../utils/date'
import { resolveMacroTaskStartDates } from '../utils/macroTaskDates'
import { buildSchedule } from '../utils/schedule'
import { getModuleName, getSubjectInlineStyle, getSubjectName } from '../utils/subjectView'
import { ConfirmDialog } from './ConfirmDialog'

const clampTaskDays = (value: number) =>
  Number.isFinite(value) ? Math.min(240, Math.max(1, Math.round(value))) : 1

const expandedDetailRows = 6
const getDefaultStartDate = () => addDaysISO(getTodayISO(), 1)

const estimateDetailRows = (detail: string) => {
  if (!detail.trim()) return 1
  return Math.max(1, detail.trim().split(/\r?\n/).length)
}

interface DragHandleBinding {
  attributes?: DraggableAttributes
  listeners?: DraggableSyntheticListeners
  setActivatorNodeRef?: (element: HTMLElement | null) => void
}

interface MacroTaskCardProps {
  task: MacroTask
  subjects: SubjectDefinition[]
  actualStartDate: string
  isExpanded: boolean
  isOverlay?: boolean
  isPlaceholder?: boolean
  orderLabel: string
  dragHandle?: DragHandleBinding
  onDeleteTask: (taskId: string) => void
  onToggleComplete: (taskId: string) => void
  onToggleExpanded: (taskId: string) => void
  onUpdateTask: (taskId: string, patch: Partial<MacroTask>) => void
}

function MacroTaskCard({
  task,
  subjects,
  actualStartDate,
  isExpanded,
  isOverlay = false,
  isPlaceholder = false,
  orderLabel,
  dragHandle,
  onDeleteTask,
  onToggleComplete,
  onToggleExpanded,
  onUpdateTask,
}: MacroTaskCardProps) {
  const detailText = task.detail?.trim() ?? ''
  const estimatedDetailRows = estimateDetailRows(detailText)
  const detailRows = Math.min(expandedDetailRows, Math.max(3, estimatedDetailRows))
  const statusLabel = task.completed ? '已完成' : '排期中'
  const stopRowToggle = (event: MouseEvent<HTMLElement>) => event.stopPropagation()
  const handleRowClick = () => {
    if (!isOverlay) onToggleExpanded(task.id)
  }
  const handleRowKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isOverlay) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onToggleExpanded(task.id)
  }

  return (
    <article
      className={`macro-item ${task.completed ? 'is-complete' : ''} ${
        isExpanded ? 'is-expanded' : ''
      } ${isOverlay ? 'drag-overlay' : ''} ${isPlaceholder ? 'is-placeholder' : ''}`}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      tabIndex={isOverlay ? -1 : 0}
    >
      <span className="macro-order" aria-label={`当前排序 ${orderLabel}`}>
        {orderLabel}
      </span>
      <button
        className="drag-handle"
        ref={dragHandle?.setActivatorNodeRef}
        type="button"
        aria-label={`拖拽排序：${task.title}`}
        onClick={stopRowToggle}
        tabIndex={isOverlay ? -1 : undefined}
        {...(dragHandle?.attributes ?? {})}
        {...(dragHandle?.listeners ?? {})}
      >
        <GripVertical size={18} aria-hidden="true" />
      </button>
      <button
        className="complete-toggle"
        onClick={(event) => {
          event.stopPropagation()
          onToggleComplete(task.id)
        }}
        type="button"
        title={task.completed ? '重新进入排期' : '标记完成'}
        tabIndex={isOverlay ? -1 : undefined}
      >
        {task.completed ? <Check size={16} /> : null}
      </button>
      <div className="macro-body">
        <input
          className="macro-title"
          value={task.title}
          onChange={(event) => onUpdateTask(task.id, { title: event.target.value })}
          onClick={stopRowToggle}
          aria-label={`${task.title} 标题`}
          readOnly={isOverlay}
          tabIndex={isOverlay ? -1 : undefined}
        />
        <span className={`macro-status-tag ${task.completed ? 'is-done' : 'is-open'}`}>
          {statusLabel}
        </span>
        <button
          className="macro-expand"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpanded(task.id)
          }}
          aria-expanded={isExpanded}
          title={isExpanded ? '收起详细内容' : '展开详细内容'}
          tabIndex={isOverlay ? -1 : undefined}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="macro-detail-panel" hidden={!isExpanded}>
          <div className="path-line macro-detail-path">
            <span className="subject-pill" style={getSubjectInlineStyle(task.subjectId, subjects)}>
              {getSubjectName(task.subjectId, subjects)}
            </span>
            <span>{getModuleName(task.moduleId, subjects)}</span>
            <span>{task.estimatedDays} 个任务日</span>
          </div>
          <label className="field macro-detail-editor" onClick={stopRowToggle}>
            <span>详细内容</span>
            <textarea
              className="macro-detail"
              rows={detailRows}
              value={task.detail ?? ''}
              onChange={(event) => onUpdateTask(task.id, { detail: event.target.value })}
              placeholder="补充该宏观任务的拆解细节"
              aria-label={`${task.title} 详细内容`}
              readOnly={isOverlay}
              tabIndex={isOverlay ? -1 : undefined}
            />
          </label>
          <button
            className="text-button danger-button macro-delete-action"
            onClick={(event) => {
              event.stopPropagation()
              onDeleteTask(task.id)
            }}
            type="button"
            title="删除宏观任务"
            tabIndex={isOverlay ? -1 : undefined}
          >
            <Trash2 size={16} />
            删除 L2
          </button>
        </div>
      </div>
      <input
        className="start-date-input"
        type="date"
        value={actualStartDate}
        onChange={(event) => onUpdateTask(task.id, { startDate: event.target.value })}
        onClick={stopRowToggle}
        aria-label={`${task.title} 起始日`}
        readOnly={isOverlay}
        tabIndex={isOverlay ? -1 : undefined}
      />
      <label className="macro-day-chip" onClick={stopRowToggle}>
        <span className="visually-hidden">{task.title} 预估任务日</span>
        <input
          className="day-input"
          min={1}
          max={240}
          type="number"
          value={task.estimatedDays}
          onChange={(event) =>
            onUpdateTask(task.id, {
              estimatedDays: clampTaskDays(Number(event.target.value)),
            })
          }
          aria-label={`${task.title} 预估任务日`}
          readOnly={isOverlay}
          tabIndex={isOverlay ? -1 : undefined}
        />
        <span aria-hidden="true">天</span>
      </label>
    </article>
  )
}

function SortableMacroTaskCard(props: MacroTaskCardProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: props.task.id,
    transition: {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  })

  const style: CSSProperties = {
    transform: isDragging ? undefined : DndCSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  return (
    <div
      className={`macro-sortable ${isDragging ? 'is-placeholder' : ''}`}
      ref={setNodeRef}
      style={style}
    >
      <MacroTaskCard
        {...props}
        dragHandle={{ attributes, listeners, setActivatorNodeRef }}
        isPlaceholder={isDragging}
      />
    </div>
  )
}

export function StrategicPlanner() {
  const subjects = usePlannerStore((state) => state.subjects)
  const macroTasks = usePlannerStore((state) => state.macroTasks)
  const microTasks = usePlannerStore((state) => state.microTasks)
  const backups = usePlannerStore((state) => state.backups)
  const addSubject = usePlannerStore((state) => state.addSubject)
  const updateSubject = usePlannerStore((state) => state.updateSubject)
  const deleteSubject = usePlannerStore((state) => state.deleteSubject)
  const addModule = usePlannerStore((state) => state.addModule)
  const updateModule = usePlannerStore((state) => state.updateModule)
  const deleteModule = usePlannerStore((state) => state.deleteModule)
  const addMacroTask = usePlannerStore((state) => state.addMacroTask)
  const updateMacroTask = usePlannerStore((state) => state.updateMacroTask)
  const deleteMacroTask = usePlannerStore((state) => state.deleteMacroTask)
  const toggleMacroTask = usePlannerStore((state) => state.toggleMacroTask)
  const reorderMacroTask = usePlannerStore((state) => state.reorderMacroTask)
  const restoreBackup = usePlannerStore((state) => state.restoreBackup)
  const loadTemplate = usePlannerStore((state) => state.loadTemplate)
  const resetDemoData = usePlannerStore((state) => state.resetDemoData)

  const defaultSubjectId = subjects[0]?.id ?? ''
  const defaultModuleId = subjects[0]?.modules[0]?.id ?? ''
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [startDate, setStartDate] = useState(getDefaultStartDate)
  const [days, setDays] = useState(6)
  const [subjectId, setSubjectId] = useState<SubjectId>(defaultSubjectId)
  const [moduleId, setModuleId] = useState(defaultModuleId)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set())
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [isResetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [isDirectoryEditorOpen, setDirectoryEditorOpen] = useState(false)
  const [directoryMessage, setDirectoryMessage] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const activeSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? subjects[0],
    [subjectId, subjects],
  )
  const activeSubjectId = activeSubject?.id ?? ''
  const availableModules = useMemo(
    () => (activeSubjectId ? getModulesForSubject(activeSubjectId, subjects) : []),
    [activeSubjectId, subjects],
  )
  const activeModule = useMemo(
    () => availableModules.find((module) => module.id === moduleId) ?? availableModules[0],
    [availableModules, moduleId],
  )
  const moduleCount = useMemo(
    () => subjects.reduce((total, subject) => total + subject.modules.length, 0),
    [subjects],
  )
  const taskCountBySubject = useMemo(() => {
    const counts = new Map<string, number>()
    macroTasks.forEach((task) => {
      counts.set(task.subjectId, (counts.get(task.subjectId) ?? 0) + 1)
    })
    return counts
  }, [macroTasks])
  const taskCountByModule = useMemo(() => {
    const counts = new Map<string, number>()
    macroTasks.forEach((task) => {
      counts.set(task.moduleId, (counts.get(task.moduleId) ?? 0) + 1)
    })
    return counts
  }, [macroTasks])

  const today = getTodayISO()
  const summary = useMemo(
    () => buildSchedule(subjects, macroTasks, microTasks, today, EXAM_DEADLINE),
    [subjects, macroTasks, microTasks, today],
  )
  const orderedTasks = useMemo(
    () => [...macroTasks].sort((left, right) => left.order - right.order),
    [macroTasks],
  )
  const actualStartDateByTaskId = useMemo(
    () => resolveMacroTaskStartDates(orderedTasks, addDaysISO(today, 1)),
    [orderedTasks, today],
  )
  const filteredTasks = useMemo(() => {
    if (activeModule) return orderedTasks.filter((task) => task.moduleId === activeModule.id)
    if (activeSubject) return orderedTasks.filter((task) => task.subjectId === activeSubject.id)
    return []
  }, [activeModule, activeSubject, orderedTasks])
  const sortableIds = filteredTasks.map((task) => task.id)
  const taskOrderLabels = useMemo(
    () =>
      new Map(
        filteredTasks.map((task, index) => [task.id, String(index + 1).padStart(2, '0')]),
      ),
    [filteredTasks],
  )
  const activeTask = activeDragId ? orderedTasks.find((task) => task.id === activeDragId) : undefined
  const activeTaskOrderLabel = activeTask
    ? taskOrderLabels.get(activeTask.id) ??
      String(orderedTasks.findIndex((task) => task.id === activeTask.id) + 1).padStart(2, '0')
    : '00'
  const closedTasks = orderedTasks.filter((task) => task.completed).length
  const selectedClosedTasks = filteredTasks.filter((task) => task.completed).length
  const selectedOpenTasks = filteredTasks.length - selectedClosedTasks
  const selectedWorkUnits = filteredTasks.reduce((total, task) => total + task.estimatedDays, 0)
  const activeSubjectStat = activeSubject
    ? summary.subjectStats.find((stat) => stat.subjectId === activeSubject.id)
    : undefined

  const handleSelectSubject = (nextSubjectId: SubjectId) => {
    const nextModules = getModulesForSubject(nextSubjectId, subjects)
    setSubjectId(nextSubjectId)
    setModuleId(nextModules[0]?.id ?? '')
  }

  const handleSelectModule = (nextSubjectId: SubjectId, nextModuleId: string) => {
    setSubjectId(nextSubjectId)
    setModuleId(nextModuleId)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !activeSubject || !activeModule) return
    const normalizedStartDate = startDate || getDefaultStartDate()

    addMacroTask({
      title: trimmedTitle,
      detail: detail.trim(),
      subjectId: activeSubject.id,
      moduleId: activeModule.id,
      estimatedDays: clampTaskDays(days),
      startDate: normalizedStartDate,
      notes: '',
    })

    setTitle('')
    setDetail('')
    setStartDate(getDefaultStartDate())
    setDays(6)
  }

  const toggleExpandedTask = (taskId: string) => {
    setExpandedTaskIds((current) => {
      const next = new Set(current)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    if (!over || active.id === over.id) return
    reorderMacroTask(
      String(active.id),
      String(over.id),
      activeSubject?.id,
      activeModule?.id,
    )
  }

  const summaryTone = summary.overflowDays > 0 ? 'danger' : 'stable'

  const handleDeleteSubject = (targetId: string) => {
    const result = deleteSubject(targetId)
    setDirectoryMessage(result.ok ? 'L0 已删除' : result.reason ?? '删除失败')
  }

  const handleDeleteModule = (targetId: string) => {
    const result = deleteModule(targetId)
    setDirectoryMessage(result.ok ? 'L1 已删除' : result.reason ?? '删除失败')
  }

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
            <strong>{subjects.length} 条/日</strong>
          </div>
          <div>
            <span>大限</span>
            <strong>{EXAM_DEADLINE}</strong>
          </div>
        </div>
      </div>

      <div className="strategy-layout">
        <aside className="directory-sidebar">
          <section className="directory-tree-panel">
            <div className="directory-panel__head">
              <div>
                <span className="eyebrow">Directory Tree</span>
                <h2>L0 / L1 导航</h2>
              </div>
            </div>

            <div className="directory-summary">
              <span>{subjects.length} 个 L0</span>
              <span>{moduleCount} 个 L1</span>
              <span>{macroTasks.length} 个 L2</span>
            </div>

            <div className="directory-tree">
              {subjects.map((subject) => {
                const isSubjectActive = activeSubject?.id === subject.id
                const subjectTaskCount = taskCountBySubject.get(subject.id) ?? 0

                return (
                  <div
                    className={`directory-subtree ${isSubjectActive ? 'is-active' : ''}`}
                    key={subject.id}
                  >
                    <button
                      className="directory-subject-button"
                      type="button"
                      onClick={() => handleSelectSubject(subject.id)}
                    >
                      <span className="subject-pill" style={{ backgroundColor: subject.color }}>
                        {subject.shortName}
                      </span>
                      <span className="directory-subject-copy">
                        <strong>{subject.name}</strong>
                        <small>
                          {subject.modules.length} 个 L1 / {subjectTaskCount} 个 L2
                        </small>
                      </span>
                    </button>

                    <div className="directory-module-list">
                      {subject.modules.length === 0 ? (
                        <div className="directory-empty">暂无 L1</div>
                      ) : (
                        subject.modules.map((module) => (
                          <button
                            className={`directory-module-button ${
                              activeModule?.id === module.id ? 'is-active' : ''
                            }`}
                            key={module.id}
                            type="button"
                            onClick={() => handleSelectModule(subject.id, module.id)}
                          >
                            <span>{module.name}</span>
                            <small>{taskCountByModule.get(module.id) ?? 0}</small>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              className={`text-button directory-edit-toggle ${
                isDirectoryEditorOpen ? 'is-active' : ''
              }`}
              type="button"
              onClick={() => setDirectoryEditorOpen((current) => !current)}
            >
              <span>
                <Settings2 size={16} />
                编辑 L0/L1 框架
              </span>
              {isDirectoryEditorOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </section>

          {isDirectoryEditorOpen ? (
            <section className="directory-editor-panel">
              <div className="directory-panel__head">
                <div>
                  <span className="eyebrow">Framework</span>
                  <h2>目录配置</h2>
                </div>
                <button className="text-button" type="button" onClick={addSubject}>
                  <Plus size={16} />
                  新增 L0
                </button>
              </div>

              {directoryMessage ? <div className="directory-message">{directoryMessage}</div> : null}

              <div className="subject-editor-list">
                {subjects.map((subject) => (
                  <article className="subject-editor-card" key={subject.id}>
                    <div className="subject-editor-card__top">
                      <span className="subject-pill" style={{ backgroundColor: subject.color }}>
                        {subject.shortName}
                      </span>
                      <button
                        className="ghost-icon"
                        type="button"
                        title="删除 L0"
                        onClick={() => handleDeleteSubject(subject.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="subject-editor-card__grid">
                      <label className="field">
                        <span>L0 名称</span>
                        <input
                          value={subject.name}
                          onChange={(event) =>
                            updateSubject(subject.id, { name: event.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>短名</span>
                        <input
                          value={subject.shortName}
                          onChange={(event) =>
                            updateSubject(subject.id, { shortName: event.target.value })
                          }
                        />
                      </label>
                    </div>

                    <div className="module-editor-list">
                      {subject.modules.map((module) => (
                        <div className="module-editor-row" key={module.id}>
                          <input
                            value={module.name}
                            onChange={(event) => updateModule(module.id, event.target.value)}
                            aria-label={`${subject.name} 的 L1 名称`}
                          />
                          <button
                            className="ghost-icon"
                            type="button"
                            title="删除 L1"
                            onClick={() => handleDeleteModule(module.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      className="text-button"
                      type="button"
                      onClick={() => addModule(subject.id)}
                    >
                      <Plus size={16} />
                      新增 L1
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="directory-support-panel backup-panel">
            <div className="directory-panel__head">
              <div>
                <span className="eyebrow">Backup</span>
                <h2>模板与备份</h2>
              </div>
              <button className="text-button" type="button" onClick={loadTemplate}>
                <Download size={16} />
                加载模板
              </button>
            </div>
            <div className="backup-list">
              {backups.length === 0 ? (
                <div className="empty-state macro-empty">暂无自动备份</div>
              ) : (
                backups.map((backup) => (
                  <button
                    className="backup-item"
                    key={backup.id}
                    type="button"
                    onClick={() => restoreBackup(backup.id)}
                  >
                    <strong>{formatZhDate(backup.createdAt.slice(0, 10))}</strong>
                    <small>{new Date(backup.createdAt).toLocaleTimeString('zh-CN')}</small>
                  </button>
                ))
              )}
            </div>
          </section>

          <button
            className="text-button danger-button"
            type="button"
            onClick={() => setResetConfirmOpen(true)}
          >
            <RotateCcw size={16} />
            重置样例
          </button>
        </aside>

        <main className="strategy-main">
          <section className="l2-workspace">
            <div className="l2-workspace-head">
              <div className="l2-workspace-title">
                <p className="eyebrow">L2 Chapter Management</p>
                <h2>{activeModule?.name ?? activeSubject?.name ?? '请选择目录'}</h2>
                <div className="path-line l2-path">
                  {activeSubject ? (
                    <span className="subject-pill" style={{ backgroundColor: activeSubject.color }}>
                      {activeSubject.name}
                    </span>
                  ) : null}
                  {activeModule ? <span>{activeModule.name}</span> : null}
                </div>
              </div>

              <div className="l2-metrics">
                <span>
                  <strong>{selectedOpenTasks}</strong>
                  未完成
                </span>
                <span>
                  <strong>{selectedWorkUnits}</strong>
                  任务日
                </span>
                <span>
                  <strong>{activeSubjectStat?.plannedCalendarDays ?? 0}</strong>
                  科目天
                </span>
              </div>
            </div>

            <form className="macro-entry l2-entry" onSubmit={handleSubmit}>
              <div className="l2-entry-main">
                <label className="field">
                  <span>L2 标题</span>
                  <input
                    value={title}
                    disabled={!activeModule}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={activeModule ? '例如：极限计算综合' : '请先在左侧新增 L1'}
                  />
                </label>
                <label className="field start-date-field">
                  <span>起始日</span>
                  <input
                    min={today}
                    type="date"
                    value={startDate}
                    disabled={!activeModule}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <label className="field days-field">
                  <span>任务日</span>
                  <input
                    min={1}
                    max={180}
                    type="number"
                    value={days}
                    disabled={!activeModule}
                    onChange={(event) => setDays(clampTaskDays(Number(event.target.value)))}
                  />
                </label>
                <button
                  className="primary-button"
                  type="submit"
                  title="新增宏观任务"
                  disabled={!activeModule}
                >
                  <Plus size={18} />
                  新增 L2
                </button>
              </div>
              <label className="field macro-detail-field">
                <span>详细内容</span>
                <textarea
                  value={detail}
                  disabled={!activeModule}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder="例如：等价替换/泰勒精度/七种未定式盲区扫描与错题归因"
                />
              </label>
            </form>

            <div className="backlog-meta l2-backlog-meta">
              <span>当前 L1：{filteredTasks.length} 个 L2</span>
              <span>{selectedClosedTasks} 个已收束</span>
              <span>全局：{summary.scheduledTaskCount} 个未完成 L2</span>
              <span>{closedTasks} 个全局已收束</span>
            </div>

            <div className="macro-list-shell">
              <div className="macro-list-header" aria-hidden="true">
                <span>序</span>
                <span />
                <span />
                <span>任务名称</span>
                <span>预计日期</span>
                <span>周期</span>
                <span>状态</span>
                <span />
              </div>

              <DndContext
                collisionDetection={closestCenter}
                onDragCancel={() => setActiveDragId(null)}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
                sensors={sensors}
              >
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <div
                    className="macro-list"
                    key={activeModule?.id ?? activeSubject?.id ?? 'empty'}
                  >
                    {filteredTasks.length === 0 ? (
                      <div className="empty-state macro-empty">
                        {activeModule ? '当前 L1 暂无 L2' : '当前 L0 暂无 L1'}
                      </div>
                    ) : (
                      filteredTasks.map((task) => (
                        <SortableMacroTaskCard
                          actualStartDate={actualStartDateByTaskId.get(task.id) ?? task.startDate}
                          isExpanded={expandedTaskIds.has(task.id)}
                          key={task.id}
                          orderLabel={taskOrderLabels.get(task.id) ?? '00'}
                          onDeleteTask={deleteMacroTask}
                          onToggleComplete={toggleMacroTask}
                          onToggleExpanded={toggleExpandedTask}
                          onUpdateTask={updateMacroTask}
                          subjects={subjects}
                          task={task}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
                <DragOverlay
                  dropAnimation={{
                    duration: 320,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {activeTask ? (
                    <MacroTaskCard
                      actualStartDate={
                        actualStartDateByTaskId.get(activeTask.id) ?? activeTask.startDate
                      }
                      isExpanded={expandedTaskIds.has(activeTask.id)}
                      isOverlay
                      orderLabel={activeTaskOrderLabel}
                      onDeleteTask={deleteMacroTask}
                      onToggleComplete={toggleMacroTask}
                      onToggleExpanded={toggleExpandedTask}
                      onUpdateTask={updateMacroTask}
                      subjects={subjects}
                      task={activeTask}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </section>
        </main>
      </div>

      <ConfirmDialog
        open={isResetConfirmOpen}
        title="重置为样例数据？"
        description="这会清空当前本地保存的目录、任务与记录，恢复成初始样例。这个操作不可撤销。"
        confirmLabel="确认重置"
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetDemoData()
          setResetConfirmOpen(false)
        }}
      />
    </section>
  )
}
