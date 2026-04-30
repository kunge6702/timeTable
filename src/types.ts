export type SubjectId = 'math' | 'english' | 'politics' | 'cs408'

export type WorkspaceView = 'execution' | 'strategy'

export interface ModuleDefinition {
  id: string
  subjectId: SubjectId
  name: string
}

export interface SubjectDefinition {
  id: SubjectId
  name: string
  shortName: string
  modules: ModuleDefinition[]
}

export interface MacroTask {
  id: string
  subjectId: SubjectId
  moduleId: string
  title: string
  estimatedDays: number
  order: number
  completed: boolean
  dependencies: string[]
  createdAt: string
  notes?: string
}

export interface MicroTask {
  id: string
  date: string
  subjectId: SubjectId
  moduleId: string
  macroTaskId?: string
  title: string
  outcome: string
  reviewNote: string
  completed: boolean
  createdAt: string
}

export type SubjectAssignments = Partial<Record<SubjectId, MacroTask>>

export interface HeatmapCell {
  date: string
  status: 'past' | 'today' | 'future'
  completionRate?: number
  assignedTasks: MacroTask[]
  assignedBySubject: SubjectAssignments
  overflowSubjects: SubjectId[]
  isOverflow: boolean
  isDeadline: boolean
  reviewSummary?: string
}
