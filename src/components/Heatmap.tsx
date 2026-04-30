import { useMemo } from 'react'
import { EXAM_DEADLINE } from '../data/catalog'
import type { HeatmapCell, SubjectId } from '../types'
import { formatZhDate, toLocalDate } from '../utils/date'
import { SUBJECT_LANES } from '../utils/schedule'

interface HeatmapProps {
  cells: HeatmapCell[]
}

const rowLabels = ['一', '二', '三', '四', '五', '六', '日']

const laneLabels: Record<SubjectId, string> = {
  math: '数学',
  english: '英语',
  politics: '政治',
  cs408: '408',
}

const getCellTone = (cell: HeatmapCell) => {
  if (cell.isDeadline) return 'deadline'
  if (cell.assignedTasks.length > 0 && cell.status !== 'past') {
    return 'planned subject-grid'
  }
  if (cell.status === 'future') {
    return cell.assignedTasks.length > 0 ? 'planned subject-grid' : 'future'
  }

  if (cell.completionRate === undefined) return 'empty'
  if (cell.completionRate < 20) return 'cold'
  if (cell.completionRate < 50) return 'low'
  if (cell.completionRate < 90) return 'medium'
  return 'hot'
}

const getMondayFirstDayIndex = (date: string) =>
  (toLocalDate(date).getDay() + 6) % 7

const summarizeAssignedTasks = (cell: HeatmapCell) =>
  SUBJECT_LANES.map((subjectId) => {
    const task = cell.assignedBySubject[subjectId]
    return task ? `${laneLabels[subjectId]}: ${task.title}` : ''
  })
    .filter(Boolean)
    .join(' / ')

const buildTooltip = (cell: HeatmapCell) => {
  const date = formatZhDate(cell.date)
  const assignedSummary = summarizeAssignedTasks(cell)

  if (cell.isOverflow && assignedSummary) {
    return `${date} / 越过 2026-12-19 / ${assignedSummary}`
  }

  if (cell.isDeadline) {
    return `${date} / 初试警戒线 ${EXAM_DEADLINE}${
      assignedSummary ? ` / 当日四科通道：${assignedSummary}` : ''
    }`
  }

  if (assignedSummary) {
    return `${date} / 当日四科通道：${assignedSummary}`
  }

  if (cell.completionRate !== undefined) {
    return `${date} / 完成率 ${cell.completionRate}%${
      cell.reviewSummary ? ` / ${cell.reviewSummary}` : ''
    }`
  }

  return `${date} / 空闲`
}

export function Heatmap({ cells }: HeatmapProps) {
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
      return monthStart
        ? `${toLocalDate(monthStart.date).getMonth() + 1}月`
        : ''
    })

    return { weeks, monthLabels: labels }
  }, [cells])

  return (
    <div className="heatmap-shell" aria-label="四科通道计划热力图">
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
                  className={`heat-cell ${getCellTone(cell)} ${
                    cell.assignedTasks.length > 0 ? 'with-subject-quadrants' : ''
                  } ${cell.isOverflow ? 'overflow' : ''}`}
                  style={{
                    gridColumn: weekIndex + 1,
                    gridRow: dayIndex + 1,
                  }}
                  type="button"
                  aria-label={buildTooltip(cell)}
                  data-tip={buildTooltip(cell)}
                >
                  {SUBJECT_LANES.map((subjectId) => {
                    const task = cell.assignedBySubject[subjectId]
                    return (
                      <span
                        className={`cell-lane subject-slot subject-${subjectId} ${
                          task ? 'is-filled' : 'is-empty'
                        } ${
                          cell.overflowSubjects.includes(subjectId)
                            ? 'is-overflow'
                            : ''
                        }`}
                        key={subjectId}
                        aria-hidden="true"
                      />
                    )
                  })}
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
