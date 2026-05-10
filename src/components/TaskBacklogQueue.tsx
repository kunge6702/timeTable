import { CheckCircle2, Flame, RotateCcw, Zap } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { BacklogTask, SubjectDefinition } from '../types'
import { getModuleName, getSubjectInlineStyle, getSubjectName } from '../utils/subjectView'

interface TaskBacklogQueueProps {
  tasks: BacklogTask[]
  subjects: SubjectDefinition[]
  recentlyCompletedTask?: BacklogTask
  onQuickAdd: (title: string) => void
  onTaskComplete: (taskId: string) => void
  onUndoTask: (taskId: string) => void
}

export function TaskBacklogQueue({
  tasks,
  subjects,
  recentlyCompletedTask,
  onQuickAdd,
  onTaskComplete,
  onUndoTask,
}: TaskBacklogQueueProps) {
  const [quickText, setQuickText] = useState('')

  const handleQuickAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = quickText.trim()
    if (!title) return
    onQuickAdd(title)
    setQuickText('')
  }

  return (
    <aside className="warmup-panel" aria-label="Task Backlog Queue">
      <header className="warmup-panel__head">
        <div>
          <p className="eyebrow">Strategic Warmth</p>
          <h2>Task Backlog</h2>
        </div>
        <div className="warmup-count" aria-label="未完成温热任务数">
          <Flame size={16} />
          <strong>{tasks.length}</strong>
        </div>
      </header>

      {recentlyCompletedTask ? (
        <div className="warmup-undo" role="status">
          <div className="warmup-undo__copy">
            <span>刚刚完成</span>
            <strong>{recentlyCompletedTask.title}</strong>
          </div>
          <button
            className="text-button warmup-undo__button"
            onClick={() => onUndoTask(recentlyCompletedTask.id)}
            type="button"
          >
            <RotateCcw size={15} />
            撤销
          </button>
        </div>
      ) : null}

      <form className="warmup-quick-add" onSubmit={handleQuickAdd}>
        <Zap size={16} aria-hidden="true" />
        <input
          value={quickText}
          onChange={(event) => setQuickText(event.target.value)}
          placeholder="输入记忆盲区并按回车..."
          aria-label="快速录入记忆盲区"
        />
      </form>

      <div className="warmup-list">
        {tasks.length === 0 ? (
          <div className="empty-state warmup-empty">今日错题缓存已清空</div>
        ) : (
          tasks.map((task) => (
            <article className="warmup-task" key={task.id}>
              <div className="warmup-task__main">
                <div className="warmup-task__meta">
                  {task.subjectId ? (
                    <span
                      className="subject-pill"
                      style={getSubjectInlineStyle(task.subjectId, subjects)}
                    >
                      {getSubjectName(task.subjectId, subjects)}
                    </span>
                  ) : (
                    <span className="subject-pill capture-pill">CAPTURE</span>
                  )}
                  <span>{task.moduleId ? getModuleName(task.moduleId, subjects) : '未归档'}</span>
                </div>
                <h3>{task.title}</h3>
                <p>{task.source}</p>
              </div>
              <button
                className="primary-button warmup-task__complete"
                onClick={() => onTaskComplete(task.id)}
                type="button"
              >
                <CheckCircle2 size={16} />
                Ping
              </button>
            </article>
          ))
        )}
      </div>
    </aside>
  )
}
