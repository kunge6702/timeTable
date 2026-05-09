import { createDefaultSubjects, getModuleLookup, getSubjectLookup } from '../data/catalog'
import type {
  ImportedMacroTaskInput,
  ImportedMicroTaskInput,
  MacroTask,
  MicroTask,
  PlannerImportPayload,
  PlannerImportMode,
  SubjectDefinition,
  SubjectId,
  WorkspaceView,
} from '../types'
import { addDaysISO, getTodayISO, maxISO } from './date'

export interface NormalizedPlannerImportData {
  view: WorkspaceView
  subjects: SubjectDefinition[]
  macroTasks: MacroTask[]
  microTasks: MicroTask[]
}

const validViews: WorkspaceView[] = ['execution', 'strategy']
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isValidIsoDate = (value: string) =>
  isoDatePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`))

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const asOptionalString = (value: unknown) => {
  const text = asString(value)
  return text.length > 0 ? text : undefined
}

const asNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const asBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined)

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : []

const isValidDateTime = (value: string) => !Number.isNaN(Date.parse(value))

const ensureView = (value: unknown): WorkspaceView => {
  if (value === undefined) return 'execution'

  const view = asString(value) as WorkspaceView
  if (!validViews.includes(view)) {
    throw new Error('view 只能是 execution 或 strategy')
  }

  return view
}

const ensureVersion = (value: unknown) => {
  if (value === undefined) return
  if (asNumber(value) !== 1) {
    throw new Error('version 目前只能是 1')
  }
}

const generateId = (prefix: string, index: number) => `${prefix}-${index + 1}`

const normalizeSubjects = (value: unknown): SubjectDefinition[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return createDefaultSubjects()
  }

  const subjects = value
    .map((item, subjectIndex) => {
      if (!isPlainObject(item)) return null

      const id = asOptionalString(item.id) ?? generateId('subject-import', subjectIndex)
      const name = asOptionalString(item.name) ?? `科目 ${subjectIndex + 1}`
      const shortName = asOptionalString(item.shortName) ?? name.slice(0, 8)
      const color =
        asOptionalString(item.color) ??
        createDefaultSubjects()[subjectIndex % createDefaultSubjects().length].color
      const rawModules = Array.isArray(item.modules) ? item.modules : []
      const modules = rawModules
        .map((module, moduleIndex) => {
          if (!isPlainObject(module)) return null
          const moduleId = asOptionalString(module.id) ?? generateId(`module-${id}`, moduleIndex)
          const moduleName = asOptionalString(module.name) ?? `模块 ${moduleIndex + 1}`

          return {
            id: moduleId,
            subjectId: id,
            name: moduleName,
          }
        })
        .filter((module): module is SubjectDefinition['modules'][number] => Boolean(module))

      return {
        id,
        name,
        shortName,
        color,
        modules,
      }
    })
    .filter((subject): subject is SubjectDefinition => Boolean(subject))

  return subjects.length > 0 ? subjects : createDefaultSubjects()
}

const ensureSubjectId = (
  value: unknown,
  index: number,
  label: '宏任务' | '微任务',
  subjectLookup: Record<string, SubjectDefinition>,
): SubjectId => {
  const subjectId = asString(value)
  if (!subjectLookup[subjectId]) {
    throw new Error(`第 ${index + 1} 条${label}的 subjectId 无效`)
  }
  return subjectId
}

const ensureModuleId = (
  subjectId: SubjectId,
  value: unknown,
  index: number,
  label: '宏任务' | '微任务',
  moduleLookup: Record<string, SubjectDefinition['modules'][number]>,
) => {
  const moduleId = asString(value)
  const module = moduleLookup[moduleId]

  if (!module || module.subjectId !== subjectId) {
    throw new Error(`第 ${index + 1} 条${label}的 moduleId 与 subjectId 不匹配`)
  }

  return moduleId
}

const normalizeMacroTasks = (
  rawTasks: ImportedMacroTaskInput[],
  subjectLookup: Record<string, SubjectDefinition>,
  moduleLookup: Record<string, SubjectDefinition['modules'][number]>,
) => {
  const ordered = rawTasks.map((task, index) => {
    const subjectId = ensureSubjectId(task.subjectId, index, '宏任务', subjectLookup)
    const moduleId = ensureModuleId(subjectId, task.moduleId, index, '宏任务', moduleLookup)
    const title = asString(task.title)

    if (!title) {
      throw new Error(`第 ${index + 1} 条宏任务缺少 title`)
    }

    const estimatedDays = Math.max(1, Math.round(asNumber(task.estimatedDays) ?? 1))
    const startDate = asOptionalString(task.startDate)

    if (startDate && !isValidIsoDate(startDate)) {
      throw new Error(`第 ${index + 1} 条宏任务的 startDate 不是合法日期`)
    }

    return {
      id: asOptionalString(task.id) ?? generateId('macro-import', index),
      subjectId,
      moduleId,
      title,
      detail: asOptionalString(task.detail),
      estimatedDays,
      startDate,
      order: Math.max(1, Math.round(asNumber(task.order) ?? index + 1)),
      completed: asBoolean(task.completed) ?? false,
      dependencies: asStringArray(task.dependencies),
      createdAt: isValidDateTime(asOptionalString(task.createdAt) ?? '')
        ? (asOptionalString(task.createdAt) as string)
        : new Date().toISOString(),
      notes: asOptionalString(task.notes),
      sourceIndex: index,
    }
  })

  const uniqueIds = new Set<string>()
  ordered.forEach((task, index) => {
    if (uniqueIds.has(task.id)) {
      throw new Error(`第 ${index + 1} 条宏任务的 id 重复`)
    }
    uniqueIds.add(task.id)
  })

  const sorted = [...ordered].sort((left, right) => {
    if (left.order === right.order) return left.sourceIndex - right.sourceIndex
    return left.order - right.order
  })

  const defaultStartDate = addDaysISO(getTodayISO(), 1)
  const nextStartBySubject = new Map<SubjectId, string>()
  const macroTasks = sorted.map((task) => {
    const startCandidate = task.startDate ?? defaultStartDate
    const nextStart = nextStartBySubject.get(task.subjectId)
    const startDate = nextStart ? maxISO(nextStart, startCandidate) : startCandidate

    nextStartBySubject.set(task.subjectId, addDaysISO(startDate, task.estimatedDays))

    return {
      id: task.id,
      subjectId: task.subjectId,
      moduleId: task.moduleId,
      title: task.title,
      detail: task.detail,
      estimatedDays: task.estimatedDays,
      startDate,
      order: task.order,
      completed: task.completed,
      dependencies: task.dependencies.filter((dependency) => Boolean(dependency)),
      createdAt: task.createdAt,
      notes: task.notes,
    } satisfies MacroTask
  })

  const macroTaskIds = new Set(macroTasks.map((task) => task.id))
  macroTasks.forEach((task) => {
    task.dependencies = task.dependencies.filter((dependency) => macroTaskIds.has(dependency))
  })

  return macroTasks
}

const normalizeMicroTasks = (
  rawTasks: ImportedMicroTaskInput[],
  macroTaskIds: Set<string>,
  subjectLookup: Record<string, SubjectDefinition>,
  moduleLookup: Record<string, SubjectDefinition['modules'][number]>,
) => {
  const uniqueIds = new Set<string>()

  return rawTasks.map((task, index) => {
    const date = asOptionalString(task.date)
    if (!date || !isValidIsoDate(date)) {
      throw new Error(`第 ${index + 1} 条微任务的 date 不是合法日期`)
    }

    const subjectId = ensureSubjectId(task.subjectId, index, '微任务', subjectLookup)
    const moduleId = ensureModuleId(subjectId, task.moduleId, index, '微任务', moduleLookup)
    const title = asString(task.title)

    if (!title) {
      throw new Error(`第 ${index + 1} 条微任务缺少 title`)
    }

    const macroTaskId = asOptionalString(task.macroTaskId)
    const createdAt = asOptionalString(task.createdAt)

    const id = asOptionalString(task.id) ?? generateId('micro-import', index)
    if (uniqueIds.has(id)) {
      throw new Error(`第 ${index + 1} 条微任务的 id 重复`)
    }
    uniqueIds.add(id)

    return {
      id,
      date,
      subjectId,
      moduleId,
      macroTaskId: macroTaskId && macroTaskIds.has(macroTaskId) ? macroTaskId : undefined,
      title,
      outcome: asOptionalString(task.outcome) ?? '',
      reviewNote: asOptionalString(task.reviewNote) ?? '',
      completed: asBoolean(task.completed) ?? false,
      createdAt:
        createdAt && !Number.isNaN(Date.parse(createdAt))
          ? createdAt
          : new Date().toISOString(),
    } satisfies MicroTask
  })
}

export const parsePlannerImportPayload = (
  value: unknown,
): NormalizedPlannerImportData => {
  if (!isPlainObject(value)) {
    throw new Error('JSON 顶层必须是对象')
  }

  ensureVersion(value.version)

  const rawMacroTasks = value.macroTasks
  if (!Array.isArray(rawMacroTasks)) {
    throw new Error('macroTasks 必须是数组')
  }

  const view = ensureView(value.view)
  const subjects = normalizeSubjects(value.subjects)
  const subjectLookup = getSubjectLookup(subjects)
  const moduleLookup = getModuleLookup(subjects)
  const macroTasks = normalizeMacroTasks(rawMacroTasks, subjectLookup, moduleLookup)
  const macroTaskIds = new Set(macroTasks.map((task) => task.id))

  const rawMicroTasks = value.microTasks
  const microTasks = Array.isArray(rawMicroTasks)
    ? normalizeMicroTasks(rawMicroTasks, macroTaskIds, subjectLookup, moduleLookup)
    : []

  return {
    view,
    subjects,
    macroTasks,
    microTasks,
  }
}

export const parsePlannerImportJson = (rawJson: string) =>
  parsePlannerImportPayload(JSON.parse(rawJson) as PlannerImportPayload)

const makeUniqueId = (baseId: string, usedIds: Set<string>) => {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId)
    return baseId
  }

  let suffix = 1
  let nextId = `${baseId}-${suffix}`

  while (usedIds.has(nextId)) {
    suffix += 1
    nextId = `${baseId}-${suffix}`
  }

  usedIds.add(nextId)
  return nextId
}

export const mergePlannerImportData = (
  current: NormalizedPlannerImportData,
  imported: NormalizedPlannerImportData,
  mode: PlannerImportMode = 'replace',
): NormalizedPlannerImportData => {
  if (mode === 'replace') {
    return imported
  }

  const currentMacroIds = new Set(current.macroTasks.map((task) => task.id))
  const usedMacroIds = new Set(currentMacroIds)
  const importedMacroIdMap = new Map<string, string>()
  const appendedMacroTasks = imported.macroTasks.map((task, index) => {
    const nextId = makeUniqueId(task.id, usedMacroIds)
    importedMacroIdMap.set(task.id, nextId)

    return {
      ...task,
      id: nextId,
      order: current.macroTasks.length + index + 1,
      dependencies: task.dependencies,
    }
  })

  const appendedMacroIds = new Set(appendedMacroTasks.map((task) => task.id))
  const normalizedMacroTasks = [
    ...current.macroTasks,
    ...appendedMacroTasks.map((task) => ({
      ...task,
      dependencies: task.dependencies
        .map((dependency) => importedMacroIdMap.get(dependency) ?? dependency)
        .filter(
          (dependency) =>
            currentMacroIds.has(dependency) || appendedMacroIds.has(dependency),
        ),
    })),
  ]

  const currentMicroIds = new Set(current.microTasks.map((task) => task.id))
  const usedMicroIds = new Set(currentMicroIds)
  const appendedMicroTasks = imported.microTasks.map((task) => {
    const nextId = makeUniqueId(task.id, usedMicroIds)
    const mappedMacroTaskId = task.macroTaskId
      ? importedMacroIdMap.get(task.macroTaskId) ?? task.macroTaskId
      : undefined

    return {
      ...task,
      id: nextId,
      macroTaskId:
        mappedMacroTaskId &&
        (currentMacroIds.has(mappedMacroTaskId) || appendedMacroIds.has(mappedMacroTaskId))
          ? mappedMacroTaskId
          : undefined,
    }
  })

  const currentSubjectIds = new Set(current.subjects.map((subject) => subject.id))
  const mergedSubjects = [
    ...current.subjects,
    ...imported.subjects.filter((subject) => !currentSubjectIds.has(subject.id)),
  ]

  return {
    view: current.view,
    subjects: mergedSubjects,
    macroTasks: normalizedMacroTasks,
    microTasks: [...current.microTasks, ...appendedMicroTasks],
  }
}
