import { CalendarDays, CheckCircle2, Circle, Clock3, LockKeyhole, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import type { MacroTask, MicroTask, SubjectDefinition } from '../types'
import { formatZhDate } from '../utils/date'
import { getModuleName, getSubjectInlineStyle, getSubjectName } from '../utils/subjectView'

interface HistoricalBoardDialogProps {
  open: boolean
  date: string | null
  subjects: SubjectDefinition[]
  macroTasks: MacroTask[]
  microTasks: MicroTask[]
  onClose: () => void
}

export function HistoricalBoardDialog({
  open,
  date,
  subjects,
  macroTasks,
  microTasks,
  onClose,
}: HistoricalBoardDialogProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const tasksForDate = useMemo(() => {
    if (!date) return []

    return microTasks
      .filter((task) => task.date === date)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  }, [date, microTasks])

  const macroTaskById = useMemo(
    () => new Map(macroTasks.map((task) => [task.id, task])),
    [macroTasks],
  )

  const doneCount = tasksForDate.filter((task) => task.completed).length
  const completionRate =
    tasksForDate.length === 0 ? 0 : Math.round((doneCount / tasksForDate.length) * 100)

  if (!open || !date) return null

  return (
    <div className="history-backdrop" onClick={onClose} role="presentation">
      <section
        className="history-dialog"
        aria-label={`${formatZhDate(date)} 的历史看板`}
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="history-dialog__header">
          <div className="history-dialog__mark" aria-hidden="true">
            <CalendarDays size={22} />
          </div>
          <div className="history-dialog__title">
            <p className="eyebrow">Past Daily Board</p>
            <h2>{formatZhDate(date)} 的今日看板</h2>
            <div className="history-dialog__chips">
              <span>
                <LockKeyhole size={13} />
                只读快照
              </span>
              <span>
                <Clock3 size={13} />
                不改动本地数据
              </span>
            </div>
          </div>
          <button className="ghost-icon" onClick={onClose} type="button" aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="history-dialog__body">
          <div className="history-board-head">
            <div className="history-board-copy">
              <p>
                这里展示的是该日期在本地记录里的 L3 执行项快照，可以回看完成率、
                outcome 和复盘，但不会开放编辑。
              </p>
            </div>

            <div className="today-meter history-meter" aria-label="历史完成率">
              <span>{formatZhDate(date)}</span>
              <strong>{completionRate}%</strong>
              <small>
                {doneCount}/{tasksForDate.length} L3
              </small>
            </div>
          </div>

          <div className="task-stack history-task-stack">
            {tasksForDate.length === 0 ? (
              <div className="empty-state history-empty">这一天没有记录到 L3 任务。</div>
            ) : (
              tasksForDate.map((task) => {
                const macro = task.macroTaskId ? macroTaskById.get(task.macroTaskId) : undefined

                return (
                  <article
                    className={`micro-task is-readonly ${task.completed ? 'is-done' : ''}`}
                    key={task.id}
                  >
                    <div className="icon-check is-static" aria-hidden="true">
                      {task.completed ? <CheckCircle2 /> : <Circle />}
                    </div>

                    <div className="micro-main">
                      <div className="micro-title readonly-text">{task.title}</div>

                      <div className="path-line">
                        <span
                          className="subject-pill"
                          style={getSubjectInlineStyle(task.subjectId, subjects)}
                        >
                          {getSubjectName(task.subjectId, subjects)}
                        </span>
                        <span>{getModuleName(task.moduleId, subjects)}</span>
                        {macro ? <span>{macro.title}</span> : null}
                      </div>

                      <div className="feedback-grid readonly-grid">
                        <label>
                          <span>Outcome</span>
                          <div className={`readonly-panel ${task.outcome.trim() ? '' : 'is-empty'}`}>
                            {task.outcome.trim() || '未填写'}
                          </div>
                        </label>

                        <label>
                          <span>Error Tracking</span>
                          <div className={`readonly-panel ${task.reviewNote.trim() ? '' : 'is-empty'}`}>
                            {task.reviewNote.trim() || '未填写'}
                          </div>
                        </label>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
