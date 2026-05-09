import { useMemo } from 'react'
import { EXAM_DEADLINE } from '../data/catalog'
import type { HeatmapCell, SubjectDefinition } from '../types'
import { formatZhDate, toLocalDate } from '../utils/date'
import { getSubjectColor } from '../data/catalog'

interface HeatmapProps {
  cells: HeatmapCell[]
  subjects: SubjectDefinition[]
  onPastDateClick?: (date: string) => void
}

const rowLabels = ['一', '二', '三', '四', '五', '六', '日']

const getCellTone = (cell: HeatmapCell) => {
  if (cell.isDeadline) return 'deadline'
  if (cell.assignedTasks.length > 0 && cell.status !== 'past') return 'planned'
  if (cell.status === 'future') return cell.assignedTasks.length > 0 ? 'planned' : 'future'
  if (cell.completionRate === undefined) return 'empty'
  if (cell.completionRate < 20) return 'cold'
  if (cell.completionRate < 50) return 'low'
  if (cell.completionRate < 90) return 'medium'
  return 'hot'
}

const getCellStateClass = (cell: HeatmapCell) => {
  const classes = []
  if (cell.status === 'today') classes.push('is-today')
  if (cell.completionRate !== undefined && cell.completionRate >= 90) {
    classes.push('is-rewarded')
  }
  return classes.join(' ')
}

const getMondayFirstDayIndex = (date: string) => (toLocalDate(date).getDay() + 6) % 7

const buildTooltip = (cell: HeatmapCell, subjects: SubjectDefinition[]) => {
  const date = formatZhDate(cell.date)
  const assignedSummary = subjects
    .map((subject) => {
      const task = cell.assignedBySubject[subject.id]
      return task ? `${subject.name}: ${task.title}` : ''
    })
    .filter(Boolean)
    .join(' / ')

  if (cell.isOverflow && assignedSummary) {
    return `${date} / 越过 2026-12-19 / ${assignedSummary}`
  }

  if (cell.isDeadline) {
    return `${date} / 初试警戒线 ${EXAM_DEADLINE}${
      assignedSummary ? ` / 当日科目通道：${assignedSummary}` : ''
    }`
  }

  if (assignedSummary) {
    return `${date} / 当日科目通道：${assignedSummary}`
  }

  if (cell.completionRate !== undefined) {
    return `${date} / 完成率 ${cell.completionRate}%${
      cell.reviewSummary ? ` / ${cell.reviewSummary}` : ''
    }`
  }

  return `${date} / 空闲`
}

export function Heatmap({ cells, subjects, onPastDateClick }: HeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    if (cells.length === 0) {
      return { weeks: [] as Array<Array<HeatmapCell | null>>, monthLabels: [] }
    }

    const firstDay = getMondayFirstDayIndex(cells[0].date)
    const weekCount = Math.ceil((cells.length + firstDay) / 7)
    const weeks = Array.from({ length: weekCount }, () =>
      Array<HeatmapCell | null>(7).fill(null),
    )

    cells.forEach((cell, index) => {
      const absoluteIndex = index + firstDay
      const weekIndex = Math.floor(absoluteIndex / 7)
      const dayIndex = absoluteIndex % 7
      weeks[weekIndex][dayIndex] = cell
    })

    const labels = weeks.map((week) => {
      const monthStart = week.find((cell) => cell?.date.endsWith('-01'))
      return monthStart ? `${toLocalDate(monthStart.date).getMonth() + 1}月` : ''
    })

    return { weeks, monthLabels: labels }
  }, [cells])

  return (
    <div className="heatmap-shell" aria-label="动态科目计划热力图">
      <div
        className="month-row"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--heat-cell))` }}
      >
        {monthLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="heatmap-body">
        <div className="day-labels" aria-hidden="true">
          {rowLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--heat-cell))` }}
        >
          {weeks.map((week, weekIndex) =>
            week.map((cell, dayIndex) =>
              cell ? (
                <button
                  key={cell.date}
                  className={`heat-cell ${getCellTone(cell)} ${getCellStateClass(cell)} ${
                    cell.isOverflow ? 'overflow' : ''
                  }`}
                  style={{
                    gridColumn: weekIndex + 1,
                    gridRow: dayIndex + 1,
                  }}
                  type="button"
                  aria-label={buildTooltip(cell, subjects)}
                  data-tip={buildTooltip(cell, subjects)}
                  onClick={() => {
                    if (cell.status !== 'past') return
                    onPastDateClick?.(cell.date)
                  }}
                  disabled={cell.status !== 'past' || !onPastDateClick}
                  aria-disabled={cell.status !== 'past' || !onPastDateClick}
                  data-clickable={cell.status === 'past' && onPastDateClick ? 'true' : 'false'}
                >
                  {subjects.length > 0 ? (
                    <span
                      className="heat-lanes"
                      style={{
                        gridTemplateColumns:
                          subjects.length <= 4
                            ? `repeat(${Math.min(2, subjects.length)}, minmax(0, 1fr))`
                            : `repeat(${Math.min(3, subjects.length)}, minmax(0, 1fr))`,
                      }}
                    >
                      {subjects.map((subject) => {
                        const task = cell.assignedBySubject[subject.id]
                        return (
                          <span
                            className={`cell-lane ${task ? 'is-filled' : 'is-empty'} ${
                              cell.overflowSubjects.includes(subject.id) ? 'is-overflow' : ''
                            }`}
                            key={subject.id}
                            aria-hidden="true"
                            style={{
                              backgroundColor: task
                                ? cell.overflowSubjects.includes(subject.id)
                                  ? 'var(--signal)'
                                  : getSubjectColor(subject.id, subjects)
                                : undefined,
                            }}
                          />
                        )
                      })}
                    </span>
                  ) : null}
                </button>
              ) : (
                <span
                  key={`blank-${weekIndex}-${dayIndex}`}
                  className="heat-cell blank"
                  style={{
                    gridColumn: weekIndex + 1,
                    gridRow: dayIndex + 1,
                  }}
                />
              ),
            ),
          )}
        </div>
      </div>
    </div>
  )
}
