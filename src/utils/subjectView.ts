import { getModuleLookup, getSubjectColor, getSubjectLookup } from '../data/catalog'
import type { SubjectDefinition, SubjectId } from '../types'

export const getSubjectName = (subjectId: SubjectId, subjects: SubjectDefinition[]) =>
  getSubjectLookup(subjects)[subjectId]?.name ?? '未归档科目'

export const getModuleName = (moduleId: string, subjects: SubjectDefinition[]) =>
  getModuleLookup(subjects)[moduleId]?.name ?? '未归档'

export const getSubjectInlineStyle = (
  subjectId: SubjectId,
  subjects: SubjectDefinition[],
) => ({
  backgroundColor: getSubjectColor(subjectId, subjects),
})
