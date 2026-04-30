import { EXAM_DEADLINE } from '../data/catalog'
import type {
  HeatmapCell,
  MacroTask,
  MicroTask,
  SubjectAssignments,
  SubjectId,
} from '../types'
import {
  addDaysISO,
  compareISO,
  diffDaysISO,
  enumerateDates,
  getTodayISO,
  isAfterISO,
  isBeforeISO,
  maxISO,
  startOfYearISO,
} from './date'

export const SUBJECT_LANES: SubjectId[] = ['math', 'english', 'politics', 'cs408']

export interface SubjectScheduleStat {
  subjectId: SubjectId
  taskCount: number
  totalWorkUnits: number
  plannedCalendarDays: number
  finishDate: string
}

export interface ScheduleSummary {
  cells: HeatmapCell[]
  finishDate: string
  overflowDays: number
  totalPlannedDays: number
  totalWorkUnits: number
  plannedCalendarDays: number
  scheduledTaskCount: number
  daysUntilDeadline: number
  subjectStats: SubjectScheduleStat[]
}

const summarizeHistory = (tasks: MicroTask[]) => {
  if (tasks.length === 0) {
    return { completionRate: undefined, reviewSummary: undefined }
  }

  const done = tasks.filter((task) => task.completed).length
  const completionRate = Math.round((done / tasks.length) * 100)
  const reviewSummary = tasks
    .map((task) => task.reviewNote || task.outcome || task.title)
    .filter(Boolean)
    .slice(0, 3)
    .join(' / ')

  return { completionRate, reviewSummary }
}

const assignTaskToDate = (
  assignments: Map<string, SubjectAssignments>,
  date: string,
  subjectId: SubjectId,
  task: MacroTask,
) => {
  const existing = assignments.get(date) ?? {}
  assignments.set(date, { ...existing, [subjectId]: task })
}

export const buildSchedule = (
  macroTasks: MacroTask[],
  microTasks: MicroTask[],
  today = getTodayISO(),
  deadline = EXAM_DEADLINE,
): ScheduleSummary => {
  const openMacroTasks = [...macroTasks]
    .filter((task) => !task.completed && task.estimatedDays > 0)
    .sort((left, right) => left.order - right.order)
  const assignments = new Map<string, SubjectAssignments>()
  const defaultStartDate = addDaysISO(today, 1)

  const subjectStats = SUBJECT_LANES.map((subjectId): SubjectScheduleStat => {
    const subjectTasks = openMacroTasks.filter(
      (task) => task.subjectId === subjectId,
    )
    const totalWorkUnits = subjectTasks.reduce(
      (sum, task) => sum + task.estimatedDays,
      0,
    )
    let cursor: string | undefined
    let firstScheduledDate: string | undefined
    let finishDate = today

    subjectTasks.forEach((task) => {
      cursor = cursor
        ? maxISO(cursor, task.startDate || defaultStartDate)
        : task.startDate || defaultStartDate
      firstScheduledDate = firstScheduledDate ?? cursor

      for (let index = 0; index < task.estimatedDays; index += 1) {
        assignTaskToDate(assignments, cursor, subjectId, task)
        cursor = addDaysISO(cursor, 1)
      }

      finishDate = addDaysISO(cursor, -1)
    })

    return {
      subjectId,
      taskCount: subjectTasks.length,
      totalWorkUnits,
      plannedCalendarDays: firstScheduledDate
        ? diffDaysISO(firstScheduledDate, finishDate) + 1
        : 0,
      finishDate: totalWorkUnits > 0 ? finishDate : today,
    }
  })

  const finishDate = maxISO(today, ...subjectStats.map((stat) => stat.finishDate))
  const plannedCalendarDays = Math.max(
    0,
    ...subjectStats.map((stat) => stat.plannedCalendarDays),
  )
  const totalWorkUnits = subjectStats.reduce(
    (sum, stat) => sum + stat.totalWorkUnits,
    0,
  )
  const overflowDays = Math.max(0, diffDaysISO(deadline, finishDate))
  const startDate = startOfYearISO(today)
  const endDate = maxISO(deadline, finishDate, addDaysISO(deadline, overflowDays + 21))

  const tasksByDate = microTasks.reduce((lookup, task) => {
    const bucket = lookup.get(task.date) ?? []
    bucket.push(task)
    lookup.set(task.date, bucket)
    return lookup
  }, new Map<string, MicroTask[]>())

  const cells = enumerateDates(startDate, endDate).map((date): HeatmapCell => {
    const assignedBySubject = assignments.get(date) ?? {}
    const assignedTasks = SUBJECT_LANES.map(
      (subjectId) => assignedBySubject[subjectId],
    ).filter((task): task is MacroTask => Boolean(task))
    const overflowSubjects = SUBJECT_LANES.filter(
      (subjectId) =>
        Boolean(assignedBySubject[subjectId]) && isAfterISO(date, deadline),
    )
    const historicalTasks = tasksByDate.get(date) ?? []
    const { completionRate, reviewSummary } = summarizeHistory(historicalTasks)
    const status = isBeforeISO(date, today)
      ? 'past'
      : compareISO(date, today) === 0
        ? 'today'
        : 'future'

    return {
      date,
      status,
      completionRate,
      assignedTasks,
      assignedBySubject,
      overflowSubjects,
      isOverflow: overflowSubjects.length > 0,
      isDeadline: date === deadline,
      reviewSummary,
    }
  })

  return {
    cells,
    finishDate,
    overflowDays,
    totalPlannedDays: totalWorkUnits,
    totalWorkUnits,
    plannedCalendarDays,
    scheduledTaskCount: openMacroTasks.length,
    daysUntilDeadline: diffDaysISO(today, deadline),
    subjectStats,
  }
}
