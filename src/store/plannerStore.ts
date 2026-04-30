import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createDefaultMacroTasks } from '../data/catalog'
import type { MacroTask, MicroTask, SubjectId, WorkspaceView } from '../types'
import { addDaysISO, getTodayISO } from '../utils/date'

type NewMicroTask = Omit<MicroTask, 'id' | 'createdAt' | 'completed'>
type NewMacroTask = Omit<
  MacroTask,
  'id' | 'order' | 'completed' | 'dependencies' | 'createdAt'
>

interface PlannerState {
  view: WorkspaceView
  macroTasks: MacroTask[]
  microTasks: MicroTask[]
  setView: (view: WorkspaceView) => void
  addMicroTask: (task: NewMicroTask) => void
  updateMicroTask: (id: string, patch: Partial<MicroTask>) => void
  toggleMicroTask: (id: string) => void
  deleteMicroTask: (id: string) => void
  addMacroTask: (task: NewMacroTask) => void
  updateMacroTask: (id: string, patch: Partial<MacroTask>) => void
  toggleMacroTask: (id: string) => void
  deleteMacroTask: (id: string) => void
  reorderMacroTask: (dragId: string, targetId: string) => void
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
  macroTasks: createDefaultMacroTasks(),
  microTasks: createDefaultMicroTasks(),
})

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

const migratePlannerState = (persistedState: unknown, version: number) => {
  const state = (persistedState ?? {}) as Partial<PlannerState>

  if (version < 2) {
    return {
      ...state,
      macroTasks: createDefaultMacroTasks(),
      microTasks: sanitizeMigratedMicroTasks(state.microTasks),
      view: state.view ?? 'execution',
    } as PlannerState
  }

  return state as PlannerState
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      view: 'execution',
      ...createInitialState(),
      setView: (view) => set({ view }),
      addMicroTask: (task) =>
        set((state) => ({
          microTasks: [
            {
              ...task,
              id: makeId('micro'),
              completed: false,
              createdAt: new Date().toISOString(),
            },
            ...state.microTasks,
          ],
        })),
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
        set((state) => ({
          microTasks: state.microTasks.filter((task) => task.id !== id),
        })),
      addMacroTask: (task) =>
        set((state) => ({
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
        })),
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
        set((state) => ({
          macroTasks: resequence(
            state.macroTasks.filter((task) => task.id !== id),
          ),
          microTasks: state.microTasks.map((task) =>
            task.macroTaskId === id ? { ...task, macroTaskId: undefined } : task,
          ),
        })),
      reorderMacroTask: (dragId, targetId) => {
        if (dragId === targetId) return

        const ordered = [...get().macroTasks].sort(
          (left, right) => left.order - right.order,
        )
        const dragIndex = ordered.findIndex((task) => task.id === dragId)
        const targetIndex = ordered.findIndex((task) => task.id === targetId)

        if (dragIndex === -1 || targetIndex === -1) return

        const [dragged] = ordered.splice(dragIndex, 1)
        ordered.splice(targetIndex, 0, dragged)
        set({ macroTasks: resequence(ordered) })
      },
      resetDemoData: () => set({ ...createInitialState(), view: 'execution' }),
    }),
    {
      name: 'exam-planner-state-v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: migratePlannerState,
    },
  ),
)

export const getSubjectClassName = (subjectId: SubjectId) =>
  `subject-${subjectId}`
