export type SubjectId = string
export type WorkspaceView = 'execution' | 'strategy'
export type PlannerImportMode = 'replace' | 'append'

export interface ModuleDefinition {
  id: string
  subjectId: SubjectId
  name: string
}

export interface SubjectDefinition {
  id: SubjectId
  name: string
  shortName: string
  color: string
  modules: ModuleDefinition[]
}

export interface MacroTask {
  id: string
  subjectId: SubjectId
  moduleId: string
  title: string
  detail?: string
  estimatedDays: number
  startDate: string
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

export interface ImportedMacroTaskInput {
  id?: string
  subjectId: SubjectId
  moduleId: string
  title: string
  detail?: string
  estimatedDays: number
  startDate?: string
  order?: number
  completed?: boolean
  dependencies?: string[]
  createdAt?: string
  notes?: string
}

export interface ImportedMicroTaskInput {
  id?: string
  date: string
  subjectId: SubjectId
  moduleId: string
  macroTaskId?: string
  title: string
  outcome?: string
  reviewNote?: string
  completed?: boolean
  createdAt?: string
}

export interface PlannerImportPayload {
  version?: number
  view?: WorkspaceView
  subjects?: SubjectDefinition[]
  macroTasks: ImportedMacroTaskInput[]
  microTasks?: ImportedMicroTaskInput[]
}

export interface PlannerBackupSnapshot {
  id: string
  createdAt: string
  view: WorkspaceView
  subjects: SubjectDefinition[]
  macroTasks: MacroTask[]
  microTasks: MicroTask[]
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
