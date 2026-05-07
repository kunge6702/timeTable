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
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import {
  EXAM_DEADLINE,
  getModulesForSubject,
  moduleById,
  subjectById,
} from '../data/catalog'
import { usePlannerStore } from '../store/plannerStore'
import type { MacroTask, SubjectId } from '../types'
import { addDaysISO, formatZhDate, getTodayISO } from '../utils/date'
import { resolveMacroTaskStartDates } from '../utils/macroTaskDates'
import { buildSchedule } from '../utils/schedule'
import { ConfirmDialog } from './ConfirmDialog'
import { Heatmap } from './Heatmap'

const defaultSubject: SubjectId = 'math'

const clampTaskDays = (value: number) =>
  Number.isFinite(value) ? Math.min(240, Math.max(1, Math.round(value))) : 1

const collapsedDetailRows = 1
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
  const canExpand = estimatedDetailRows > collapsedDetailRows
  const detailRows = isExpanded
    ? Math.min(expandedDetailRows, estimatedDetailRows)
    : Math.min(collapsedDetailRows, estimatedDetailRows)

  return (
    <article
      className={`macro-item ${task.completed ? 'is-complete' : ''} ${
        isExpanded ? 'is-expanded' : ''
      } ${isOverlay ? 'drag-overlay' : ''} ${
        isPlaceholder ? 'is-placeholder' : ''
      }`}
    >
      <span className="macro-order" aria-label={`当前排序 ${orderLabel}`}>
        {orderLabel}
      </span>
      <button
        className="drag-handle"
        ref={dragHandle?.setActivatorNodeRef}
        type="button"
        aria-label={`拖拽排序：${task.title}`}
        tabIndex={isOverlay ? -1 : undefined}
        {...(dragHandle?.attributes ?? {})}
        {...(dragHandle?.listeners ?? {})}
      >
        <GripVertical size={18} aria-hidden="true" />
      </button>
      <button
        className="complete-toggle"
        onClick={() => onToggleComplete(task.id)}
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
          aria-label={`${task.title} 标题`}
          readOnly={isOverlay}
          tabIndex={isOverlay ? -1 : undefined}
        />
        <textarea
          className={`macro-detail ${isExpanded ? 'is-expanded' : ''}`}
          rows={detailRows}
          value={task.detail ?? ''}
          onChange={(event) => onUpdateTask(task.id, { detail: event.target.value })}
          placeholder="补充该宏观任务的拆解细节"
          aria-label={`${task.title} 详细内容`}
          readOnly={isOverlay}
          tabIndex={isOverlay ? -1 : undefined}
          wrap="off"
        />
        <div className="path-line">
          <span className={`subject-pill subject-${task.subjectId}`}>
            {subjectById[task.subjectId].name}
          </span>
          <span>{moduleById[task.moduleId]?.name ?? '未归档'}</span>
        </div>
        {canExpand ? (
          <button
            className="macro-expand"
            type="button"
            onClick={() => onToggleExpanded(task.id)}
            aria-expanded={isExpanded}
            title={isExpanded ? '收起详细内容' : '展开详细内容'}
            tabIndex={isOverlay ? -1 : undefined}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? '收起详情' : '展开详情'}
          </button>
        ) : null}
      </div>
      <input
        className="start-date-input"
        type="date"
        value={actualStartDate}
        onChange={(event) =>
          onUpdateTask(task.id, { startDate: event.target.value })
        }
        aria-label={`${task.title} 起始日`}
        readOnly={isOverlay}
        tabIndex={isOverlay ? -1 : undefined}
      />
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
      <button
        className="ghost-icon"
        onClick={() => onDeleteTask(task.id)}
        type="button"
        title="删除宏观任务"
        tabIndex={isOverlay ? -1 : undefined}
      >
        <Trash2 size={17} />
      </button>
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
  const macroTasks = usePlannerStore((state) => state.macroTasks)
  const microTasks = usePlannerStore((state) => state.microTasks)
  const addMacroTask = usePlannerStore((state) => state.addMacroTask)
  const updateMacroTask = usePlannerStore((state) => state.updateMacroTask)
  const deleteMacroTask = usePlannerStore((state) => state.deleteMacroTask)
  const toggleMacroTask = usePlannerStore((state) => state.toggleMacroTask)
  const reorderMacroTask = usePlannerStore((state) => state.reorderMacroTask)
  const resetDemoData = usePlannerStore((state) => state.resetDemoData)

  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [startDate, setStartDate] = useState(getDefaultStartDate)
  const [days, setDays] = useState(6)
  const [subjectId, setSubjectId] = useState<SubjectId>(defaultSubject)
  const [moduleId, setModuleId] = useState(
    getModulesForSubject(defaultSubject)[0].id,
  )
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set())
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [isResetConfirmOpen, setResetConfirmOpen] = useState(false)

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

  const today = getTodayISO()
  const summary = useMemo(
    () => buildSchedule(macroTasks, microTasks, today, EXAM_DEADLINE),
    [macroTasks, microTasks, today],
  )
  const orderedTasks = useMemo(
    () => [...macroTasks].sort((left, right) => left.order - right.order),
    [macroTasks],
  )
  const actualStartDateByTaskId = useMemo(
    () => resolveMacroTaskStartDates(orderedTasks, addDaysISO(today, 1)),
    [orderedTasks, today],
  )
  const filteredTasks = useMemo(
    () =>
      subjectFilter === null
        ? orderedTasks
        : orderedTasks.filter((task) => task.subjectId === subjectFilter),
    [orderedTasks, subjectFilter],
  )
  const sortableIds = filteredTasks.map((task) => task.id)
  const taskOrderLabels = useMemo(
    () =>
      new Map(
        filteredTasks.map((task, index) => [
          task.id,
          String(index + 1).padStart(2, '0'),
        ]),
      ),
    [filteredTasks],
  )
  const activeTask = activeDragId
    ? orderedTasks.find((task) => task.id === activeDragId)
    : undefined
  const activeTaskOrderLabel = activeTask
    ? taskOrderLabels.get(activeTask.id) ??
      String(orderedTasks.findIndex((task) => task.id === activeTask.id) + 1).padStart(
        2,
        '0',
      )
    : '00'
  const closedTasks = orderedTasks.filter((task) => task.completed).length

  const handleSubjectChange = (nextSubjectId: SubjectId) => {
    setSubjectId(nextSubjectId)
    setModuleId(getModulesForSubject(nextSubjectId)[0].id)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const normalizedStartDate = startDate || getDefaultStartDate()

    addMacroTask({
      title: trimmedTitle,
      detail: detail.trim(),
      subjectId,
      moduleId,
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
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
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
      subjectFilter ?? undefined,
    )
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
              <span>L2 标题</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：极限计算综合"
              />
              <small className="field-hint">标题只写短名称，长说明全部放到“详细内容”里。</small>
            </label>
            <label className="field macro-detail-field">
              <span>详细内容</span>
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="例如：等价替换/泰勒精度/七种未定式盲区扫描与错题归因"
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
              <label className="field start-date-field">
                <span>起始日</span>
                <input
                  min={today}
                  type="date"
                  value={startDate}
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
                  onChange={(event) =>
                    setDays(clampTaskDays(Number(event.target.value)))
                  }
                />
              </label>
            </div>
            <div className="lane-explain">
              <strong>四科固定通道</strong>
              <span>
                起始日作为当前 L2 的最早开工日；每天数学、英语、政治、408
                各推进 1 个当前 L2，单科内部按 order 串行。
              </span>
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
              <button
                className={`subject-stat ${
                  subjectFilter === stat.subjectId ? 'is-active' : ''
                }`}
                key={stat.subjectId}
                onClick={() =>
                  setSubjectFilter((current) =>
                    current === stat.subjectId ? null : stat.subjectId,
                  )
                }
                type="button"
                aria-pressed={subjectFilter === stat.subjectId}
              >
                <span className={`subject-pill subject-${stat.subjectId}`}>
                  {subjectById[stat.subjectId].name}
                </span>
                <strong>{stat.plannedCalendarDays} 天</strong>
                <small>
                  {stat.taskCount} 个 L2 / {stat.totalWorkUnits} 个任务日
                </small>
              </button>
            ))}
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragCancel={() => setActiveDragId(null)}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            sensors={sensors}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="macro-list" key={subjectFilter ?? 'all'}>
                {filteredTasks.length === 0 ? (
                  <div className="empty-state macro-empty">当前科目暂无 L2</div>
                ) : (
                  filteredTasks.map((task) => (
                    <SortableMacroTaskCard
                      actualStartDate={
                        actualStartDateByTaskId.get(task.id) ?? task.startDate
                      }
                      isExpanded={expandedTaskIds.has(task.id)}
                      key={task.id}
                      orderLabel={taskOrderLabels.get(task.id) ?? '00'}
                      onDeleteTask={deleteMacroTask}
                      onToggleComplete={toggleMacroTask}
                      onToggleExpanded={toggleExpandedTask}
                      onUpdateTask={updateMacroTask}
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
                  task={activeTask}
                />
              ) : null}
            </DragOverlay>
          </DndContext>

          <button
            className="text-button danger-button"
            type="button"
            onClick={() => setResetConfirmOpen(true)}
          >
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

      <ConfirmDialog
        open={isResetConfirmOpen}
        title="重置为样例数据？"
        description="这会清空当前本地保存的任务与记录，恢复成初始样例。这个操作不可撤销。"
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
