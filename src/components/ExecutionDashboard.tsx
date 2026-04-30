import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { getModulesForSubject, moduleById, subjectById } from '../data/catalog'
import { usePlannerStore } from '../store/plannerStore'
import type { SubjectId } from '../types'
import { formatZhDate, getTodayISO } from '../utils/date'

const defaultSubject: SubjectId = 'math'

export function ExecutionDashboard() {
  const today = getTodayISO()
  const macroTasks = usePlannerStore((state) => state.macroTasks)
  const microTasks = usePlannerStore((state) => state.microTasks)
  const addMicroTask = usePlannerStore((state) => state.addMicroTask)
  const updateMicroTask = usePlannerStore((state) => state.updateMicroTask)
  const toggleMicroTask = usePlannerStore((state) => state.toggleMicroTask)
  const deleteMicroTask = usePlannerStore((state) => state.deleteMicroTask)

  const [title, setTitle] = useState('')
  const [outcome, setOutcome] = useState('')
  const [subjectId, setSubjectId] = useState<SubjectId>(defaultSubject)
  const [moduleId, setModuleId] = useState(getModulesForSubject(defaultSubject)[0].id)
  const [macroTaskId, setMacroTaskId] = useState('')

  const subjectModules = getModulesForSubject(subjectId)
  const filteredMacros = macroTasks
    .filter((task) => task.subjectId === subjectId && task.moduleId === moduleId)
    .sort((left, right) => left.order - right.order)

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

  const handleSubjectChange = (nextSubjectId: SubjectId) => {
    const nextModuleId = getModulesForSubject(nextSubjectId)[0].id
    setSubjectId(nextSubjectId)
    setModuleId(nextModuleId)
    setMacroTaskId('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    addMicroTask({
      date: today,
      title: trimmedTitle,
      outcome: outcome.trim(),
      reviewNote: '',
      subjectId,
      moduleId,
      macroTaskId: macroTaskId || undefined,
    })

    setTitle('')
    setOutcome('')
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
            value={subjectId}
            onChange={(event) => handleSubjectChange(event.target.value as SubjectId)}
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
            value={macroTaskId}
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
            return (
              <article
                className={`micro-task ${task.completed ? 'is-done' : ''}`}
                key={task.id}
              >
                <button
                  className="icon-check"
                  onClick={() => toggleMicroTask(task.id)}
                  type="button"
                  title={task.completed ? '标记未完成' : '标记完成'}
                >
                  {task.completed ? <CheckCircle2 /> : <Circle />}
                </button>
                <div className="micro-main">
                  <input
                    className="micro-title"
                    value={task.title}
                    onChange={(event) =>
                      updateMicroTask(task.id, { title: event.target.value })
                    }
                  />
                  <div className="path-line">
                    <span className={`subject-pill subject-${task.subjectId}`}>
                      {subjectById[task.subjectId].name}
                    </span>
                    <span>{moduleById[task.moduleId]?.name ?? '未归档'}</span>
                    {macro ? <span>{macro.title}</span> : null}
                  </div>
                  <div className="feedback-grid">
                    <label>
                      <span>预期效果</span>
                      <textarea
                        value={task.outcome}
                        onChange={(event) =>
                          updateMicroTask(task.id, { outcome: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Error Tracking</span>
                      <textarea
                        value={task.reviewNote}
                        onChange={(event) =>
                          updateMicroTask(task.id, { reviewNote: event.target.value })
                        }
                      />
                    </label>
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
    </section>
  )
}
