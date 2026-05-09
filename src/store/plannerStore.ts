import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  createDefaultMacroTasks,
  createDefaultSubjects,
  getModuleLookup,
  splitMacroTaskText,
} from '../data/catalog'
import type {
  MacroTask,
  MicroTask,
  PlannerBackupSnapshot,
  PlannerImportMode,
  SubjectDefinition,
  SubjectId,
  WorkspaceView,
} from '../types'
import { addDaysISO, getTodayISO } from '../utils/date'
import { sortMacroTasksByOrder } from '../utils/macroTaskDates'
import {
  mergePlannerImportData,
  parsePlannerImportPayload,
  type NormalizedPlannerImportData,
} from '../utils/plannerImport'

type NewMicroTask = Omit<MicroTask, 'id' | 'createdAt' | 'completed'>
type NewMacroTask = Omit<
  MacroTask,
  'id' | 'order' | 'completed' | 'dependencies' | 'createdAt'
>
type PersistedMacroTask = Omit<MacroTask, 'startDate'> & { startDate?: string }

const backupStorageKey = 'exam-planner-backups-v1'
const maxBackupSnapshots = 5

interface PlannerState {
  view: WorkspaceView
  subjects: SubjectDefinition[]
  macroTasks: MacroTask[]
  microTasks: MicroTask[]
  backups: PlannerBackupSnapshot[]
  setView: (view: WorkspaceView) => void
  addSubject: () => void
  updateSubject: (id: string, patch: Partial<Pick<SubjectDefinition, 'name' | 'shortName'>>) => void
  deleteSubject: (id: string) => { ok: boolean; reason?: string }
  addModule: (subjectId: string) => void
  updateModule: (moduleId: string, name: string) => void
  deleteModule: (moduleId: string) => { ok: boolean; reason?: string }
  addMicroTask: (task: NewMicroTask) => void
  updateMicroTask: (id: string, patch: Partial<MicroTask>) => void
  toggleMicroTask: (id: string) => void
  deleteMicroTask: (id: string) => void
  addMacroTask: (task: NewMacroTask) => void
  updateMacroTask: (id: string, patch: Partial<MacroTask>) => void
  toggleMacroTask: (id: string) => void
  deleteMacroTask: (id: string) => void
  reorderMacroTask: (
    dragId: string,
    targetId: string,
    subjectId?: SubjectId,
    moduleId?: string,
  ) => void
  importPlannerData: (payload: unknown, mode?: PlannerImportMode) => NormalizedPlannerImportData
  restoreBackup: (backupId: string) => boolean
  loadTemplate: () => void
  resetDemoData: () => void
}

const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const resequence = (tasks: MacroTask[]) =>
  tasks.map((task, index) => ({ ...task, order: index + 1 }))

const createDefaultMicroTasks = (): MicroTask[] => {
  const today = getTodayISO()
  const seeds: Array<Omit<MicroTask, 'id' | 'createdAt'>> = [
    {
      date: addDaysISO(today, -4),
      subjectId: 'math',
      moduleId: 'gaoshu',
      macroTaskId: 'math-hs-01',
      title: '硬算 3 道极限综合题',
      outcome: '定位等价替换、泰勒精度和未定式切换盲区',
      reviewNote: '泰勒展开漏项，已加入错因索引',
      completed: true,
    },
    {
      date: addDaysISO(today, -3),
      subjectId: 'math',
      moduleId: 'gaoshu',
      macroTaskId: 'math-hs-02',
      title: '数列极限夹逼构造 5 题',
      outcome: '能识别夹逼、单调有界和定积分定义三类入口',
      reviewNote: '定积分定义换元还不够顺',
      completed: true,
    },
    {
      date: addDaysISO(today, -2),
      subjectId: 'math',
      moduleId: 'xiandai',
      macroTaskId: 'math-la-01',
      title: '行列式与矩阵初等变换题组',
      outcome: '暴露秩与逆矩阵关系的条件遗漏',
      reviewNote: '伴随矩阵性质需要回炉',
      completed: false,
    },
    {
      date: addDaysISO(today, -1),
      subjectId: 'math',
      moduleId: 'gailv',
      macroTaskId: 'math-pb-01',
      title: '一维随机变量分布函数 6 题',
      outcome: '能把事件语言翻译成分布函数区间',
      reviewNote: '分段端点处理失误 1 次',
      completed: true,
    },
    {
      date: today,
      subjectId: 'math',
      moduleId: 'gaoshu',
      macroTaskId: 'math-hs-01',
      title: 'Fail Fast：七种未定式各扫 1 题',
      outcome: '找出极限计算的第一反应误区',
      reviewNote: '',
      completed: false,
    },
  ]

  return seeds.map((task, index) => ({
    ...task,
    id: `micro-${index + 1}`,
    createdAt: new Date().toISOString(),
  }))
}

const createInitialState = () => ({
  subjects: createDefaultSubjects(),
  macroTasks: createDefaultMacroTasks(),
  microTasks: createDefaultMicroTasks(),
  backups: [] as PlannerBackupSnapshot[],
})

const addFallbackStartDates = (macroTasks: PersistedMacroTask[]): MacroTask[] => {
  const defaultStartDate = addDaysISO(getTodayISO(), 1)
  const fallbackStartById = new Map<string, string>()
  const nextStartBySubject = new Map<SubjectId, string>()
  const orderedTasks = sortMacroTasksByOrder(macroTasks as MacroTask[])

  orderedTasks.forEach((task) => {
    const startDate = nextStartBySubject.get(task.subjectId) ?? defaultStartDate
    fallbackStartById.set(task.id, startDate)
    nextStartBySubject.set(task.subjectId, addDaysISO(startDate, task.estimatedDays))
  })

  return macroTasks.map((task) => ({
    ...task,
    startDate: task.startDate || fallbackStartById.get(task.id) || defaultStartDate,
  }))
}

const sanitizeMigratedMacroTasks = (macroTasks?: PersistedMacroTask[]) => {
  if (!macroTasks) return createDefaultMacroTasks()

  const normalizedTasks = macroTasks.map((task) => {
    if (task.detail !== undefined) return task

    const { title, detail } = splitMacroTaskText(task.title)
    return {
      ...task,
      title,
      detail,
    }
  })

  return addFallbackStartDates(normalizedTasks)
}

const sanitizeMigratedMicroTasks = (microTasks?: MicroTask[]) => {
  if (!microTasks) return createDefaultMicroTasks()

  const macroIds = new Set(createDefaultMacroTasks().map((task) => task.id))
  const legacyMacroIdMap: Record<string, string> = {
    'macro-1': 'math-hs-01',
    'macro-2': 'math-la-01',
    'macro-3': 'math-pb-01',
  }

  return microTasks.map((task) => {
    const mappedMacroTaskId = task.macroTaskId
      ? legacyMacroIdMap[task.macroTaskId] ?? task.macroTaskId
      : undefined

    return {
      ...task,
      macroTaskId:
        mappedMacroTaskId && macroIds.has(mappedMacroTaskId)
          ? mappedMacroTaskId
          : undefined,
    }
  })
}

const sanitizeSubjects = (subjects?: SubjectDefinition[]) => {
  if (!subjects || subjects.length === 0) return createDefaultSubjects()

  return subjects.map((subject, subjectIndex) => ({
    ...subject,
    color: subject.color || createDefaultSubjects()[subjectIndex % createDefaultSubjects().length].color,
    modules: subject.modules.map((module) => ({
      ...module,
      subjectId: subject.id,
    })),
  }))
}

const readBackupsFromStorage = () => {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(backupStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PlannerBackupSnapshot[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeBackupsToStorage = (snapshots: PlannerBackupSnapshot[]) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(backupStorageKey, JSON.stringify(snapshots))
}

const createBackupSnapshot = (state: {
  view: WorkspaceView
  subjects: SubjectDefinition[]
  macroTasks: MacroTask[]
  microTasks: MicroTask[]
}): PlannerBackupSnapshot => ({
  id: makeId('backup'),
  createdAt: new Date().toISOString(),
  view: state.view,
  subjects: state.subjects,
  macroTasks: state.macroTasks,
  microTasks: state.microTasks,
})

const mergeBackups = (state: {
  backups: PlannerBackupSnapshot[]
  view: WorkspaceView
  subjects: SubjectDefinition[]
  macroTasks: MacroTask[]
  microTasks: MicroTask[]
}) => {
  const nextSnapshots = [
    createBackupSnapshot(state),
    ...state.backups,
  ].slice(0, maxBackupSnapshots)

  writeBackupsToStorage(nextSnapshots)
  return nextSnapshots
}

const migratePlannerState = (persistedState: unknown, version: number) => {
  const state = (persistedState ?? {}) as Partial<PlannerState> & {
    moduleNameOverrides?: Record<string, string>
  }
  let nextState = state

  if (version < 2) {
    nextState = {
      ...state,
      macroTasks: createDefaultMacroTasks(),
      microTasks: sanitizeMigratedMicroTasks(state.microTasks),
      view: state.view ?? 'execution',
    }
  }

  if (version < 3) {
    nextState = {
      ...nextState,
      macroTasks: sanitizeMigratedMacroTasks(nextState.macroTasks),
    }
  }

  if (version < 4) {
    nextState = {
      ...nextState,
      macroTasks: sanitizeMigratedMacroTasks(nextState.macroTasks),
    }
  }

  if (version < 5) {
    const subjects = createDefaultSubjects()
    if (state.moduleNameOverrides) {
      const moduleLookup = getModuleLookup(subjects)
      Object.entries(state.moduleNameOverrides).forEach(([moduleId, name]) => {
        if (moduleLookup[moduleId] && name.trim()) {
          moduleLookup[moduleId].name = name.trim()
        }
      })
    }

    nextState = {
      ...nextState,
      subjects,
    }
  }

  if (version < 6) {
    nextState = {
      ...nextState,
      subjects: sanitizeSubjects(nextState.subjects),
      backups: readBackupsFromStorage(),
    }
  }

  return nextState as PlannerState
}

const canDeleteSubject = (
  subjectId: string,
  subjects: SubjectDefinition[],
  macroTasks: MacroTask[],
  microTasks: MicroTask[],
) => {
  const subject = subjects.find((item) => item.id === subjectId)
  if (!subject) return { ok: false, reason: '科目不存在' }
  if (subject.modules.length > 0) return { ok: false, reason: '该 L0 下还有 L1，不能删除' }
  if (macroTasks.some((task) => task.subjectId === subjectId)) {
    return { ok: false, reason: '该 L0 下还有 L2，不能删除' }
  }
  if (microTasks.some((task) => task.subjectId === subjectId)) {
    return { ok: false, reason: '该 L0 下还有 L3，不能删除' }
  }
  return { ok: true }
}

const canDeleteModule = (
  moduleId: string,
  macroTasks: MacroTask[],
  microTasks: MicroTask[],
) => {
  if (macroTasks.some((task) => task.moduleId === moduleId)) {
    return { ok: false, reason: '该 L1 下还有 L2，不能删除' }
  }
  if (microTasks.some((task) => task.moduleId === moduleId)) {
    return { ok: false, reason: '该 L1 下还有 L3，不能删除' }
  }
  return { ok: true }
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      view: 'execution',
      ...createInitialState(),
      backups: readBackupsFromStorage(),
      setView: (view) => set({ view }),
      addSubject: () =>
        set((state) => {
          const subjectIndex = state.subjects.length
          const nextState = {
            ...state,
            subjects: [
              ...state.subjects,
              {
                id: makeId('subject'),
                name: `新科目 ${subjectIndex + 1}`,
                shortName: `SUB${subjectIndex + 1}`,
                color: createDefaultSubjects()[subjectIndex % createDefaultSubjects().length].color,
                modules: [],
              },
            ],
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      updateSubject: (id, patch) =>
        set((state) => {
          const nextState = {
            ...state,
            subjects: state.subjects.map((subject) =>
              subject.id === id
                ? {
                    ...subject,
                    name: patch.name?.trim() || subject.name,
                    shortName: patch.shortName?.trim() || subject.shortName,
                  }
                : subject,
            ),
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      deleteSubject: (id) => {
        const guard = canDeleteSubject(
          id,
          get().subjects,
          get().macroTasks,
          get().microTasks,
        )
        if (!guard.ok) return guard

        set((state) => {
          const nextState = {
            ...state,
            subjects: state.subjects.filter((subject) => subject.id !== id),
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        })
        return { ok: true }
      },
      addModule: (subjectId) =>
        set((state) => {
          const nextState = {
            ...state,
            subjects: state.subjects.map((subject) =>
              subject.id === subjectId
                ? {
                    ...subject,
                    modules: [
                      ...subject.modules,
                      {
                        id: makeId('module'),
                        subjectId,
                        name: `新模块 ${subject.modules.length + 1}`,
                      },
                    ],
                  }
                : subject,
            ),
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      updateModule: (moduleId, name) =>
        set((state) => {
          const nextState = {
            ...state,
            subjects: state.subjects.map((subject) => ({
              ...subject,
              modules: subject.modules.map((module) =>
                module.id === moduleId
                  ? { ...module, name: name.trim() || module.name }
                  : module,
              ),
            })),
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      deleteModule: (moduleId) => {
        const guard = canDeleteModule(moduleId, get().macroTasks, get().microTasks)
        if (!guard.ok) return guard

        set((state) => {
          const nextState = {
            ...state,
            subjects: state.subjects.map((subject) => ({
              ...subject,
              modules: subject.modules.filter((module) => module.id !== moduleId),
            })),
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        })
        return { ok: true }
      },
      addMicroTask: (task) =>
        set((state) => {
          const nextState = {
            ...state,
            microTasks: [
              {
                ...task,
                id: makeId('micro'),
                completed: false,
                createdAt: new Date().toISOString(),
              },
              ...state.microTasks,
            ],
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      updateMicroTask: (id, patch) =>
        set((state) => ({
          microTasks: state.microTasks.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
          ),
        })),
      toggleMicroTask: (id) =>
        set((state) => ({
          microTasks: state.microTasks.map((task) =>
            task.id === id ? { ...task, completed: !task.completed } : task,
          ),
        })),
      deleteMicroTask: (id) =>
        set((state) => {
          const nextState = {
            ...state,
            microTasks: state.microTasks.filter((task) => task.id !== id),
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      addMacroTask: (task) =>
        set((state) => {
          const nextState = {
            ...state,
            macroTasks: [
              ...state.macroTasks,
              {
                ...task,
                id: makeId('macro'),
                order:
                  Math.max(0, ...state.macroTasks.map((macro) => macro.order)) + 1,
                completed: false,
                dependencies: [],
                createdAt: new Date().toISOString(),
              },
            ],
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      updateMacroTask: (id, patch) =>
        set((state) => ({
          macroTasks: state.macroTasks.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
          ),
        })),
      toggleMacroTask: (id) =>
        set((state) => ({
          macroTasks: state.macroTasks.map((task) =>
            task.id === id ? { ...task, completed: !task.completed } : task,
          ),
        })),
      deleteMacroTask: (id) =>
        set((state) => {
          const nextState = {
            ...state,
            macroTasks: resequence(state.macroTasks.filter((task) => task.id !== id)),
            microTasks: state.microTasks.map((task) =>
              task.macroTaskId === id ? { ...task, macroTaskId: undefined } : task,
            ),
          }
          return {
            ...nextState,
            backups: mergeBackups(nextState),
          }
        }),
      reorderMacroTask: (dragId, targetId, subjectId, moduleId) => {
        if (dragId === targetId) return

        const ordered = [...get().macroTasks].sort((left, right) => left.order - right.order)
        const isInScope = (task: MacroTask) => {
          if (moduleId) return task.moduleId === moduleId
          if (subjectId) return task.subjectId === subjectId
          return true
        }
        const reorderScope = ordered.filter(isInScope)
        const dragIndex = reorderScope.findIndex((task) => task.id === dragId)
        const targetIndex = reorderScope.findIndex((task) => task.id === targetId)

        if (dragIndex === -1 || targetIndex === -1) return

        const nextScope = [...reorderScope]
        const [dragged] = nextScope.splice(dragIndex, 1)
        nextScope.splice(targetIndex, 0, dragged)

        if (!subjectId && !moduleId) {
          const nextState = {
            ...get(),
            macroTasks: resequence(nextScope),
          }
          set({
            macroTasks: nextState.macroTasks,
            backups: mergeBackups(nextState),
          })
          return
        }

        const scopeQueue = [...nextScope]
        const merged = ordered.map((task) => (isInScope(task) ? scopeQueue.shift() ?? task : task))
        const nextState = {
          ...get(),
          macroTasks: resequence(merged),
        }
        set({
          macroTasks: nextState.macroTasks,
          backups: mergeBackups(nextState),
        })
      },
      importPlannerData: (payload, mode = 'replace') => {
        const imported = parsePlannerImportPayload(payload)
        const merged = mergePlannerImportData(
          {
            view: get().view,
            subjects: get().subjects,
            macroTasks: get().macroTasks,
            microTasks: get().microTasks,
          },
          imported,
          mode,
        )

        set({
          view: merged.view,
          subjects: merged.subjects,
          macroTasks: merged.macroTasks,
          microTasks: merged.microTasks,
          backups: mergeBackups({
            backups: get().backups,
            view: merged.view,
            subjects: merged.subjects,
            macroTasks: merged.macroTasks,
            microTasks: merged.microTasks,
          }),
        })
        return merged
      },
      restoreBackup: (backupId) => {
        const backup = get().backups.find((item) => item.id === backupId)
        if (!backup) return false
        set({
          view: backup.view,
          subjects: backup.subjects,
          macroTasks: backup.macroTasks,
          microTasks: backup.microTasks,
          backups: get().backups,
        })
        return true
      },
      loadTemplate: () => {
        const nextState = {
          view: 'execution' as WorkspaceView,
          ...createInitialState(),
        }
        set({
          ...nextState,
          backups: mergeBackups(nextState),
        })
      },
      resetDemoData: () => {
        const nextState = {
          view: 'execution' as WorkspaceView,
          ...createInitialState(),
        }
        set({
          ...nextState,
          backups: mergeBackups(nextState),
        })
      },
    }),
    {
      name: 'exam-planner-state-v1',
      storage: createJSONStorage(() => localStorage),
      version: 6,
      migrate: migratePlannerState,
    },
  ),
)

export const getSubjectClassName = (subjectId: SubjectId) => `subject-${subjectId}`
