import type { MacroTask, SubjectId } from '../types'
import { addDaysISO, getTodayISO, maxISO } from './date'

export const sortMacroTasksByOrder = (macroTasks: MacroTask[]) =>
  [...macroTasks].sort((left, right) => {
    if (left.order === right.order) {
      return left.createdAt.localeCompare(right.createdAt)
    }

    return left.order - right.order
  })

export const resolveMacroTaskStartDates = (
  macroTasks: MacroTask[],
  defaultStartDate = addDaysISO(getTodayISO(), 1),
) => {
  const nextStartBySubject = new Map<SubjectId, string>()
  const startDateByTaskId = new Map<string, string>()

  sortMacroTasksByOrder(macroTasks).forEach((task) => {
    const requestedStartDate = task.startDate || defaultStartDate
    const nextStartDate = nextStartBySubject.get(task.subjectId)
    const startDate = task.completed
      ? requestedStartDate
      : nextStartDate
        ? maxISO(nextStartDate, requestedStartDate)
        : requestedStartDate

    startDateByTaskId.set(task.id, startDate)

    if (!task.completed && task.estimatedDays > 0) {
      nextStartBySubject.set(
        task.subjectId,
        addDaysISO(startDate, task.estimatedDays),
      )
    }
  })

  return startDateByTaskId
}
