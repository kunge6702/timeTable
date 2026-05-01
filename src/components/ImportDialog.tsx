import { Check, Plus, RotateCcw, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { usePlannerStore } from '../store/plannerStore'
import type { PlannerImportMode } from '../types'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
}

const helperIdRows = [
  'subjectId: math / english / politics / cs408',
  'moduleId 必须和 subjectId 对应',
  '日期统一使用 YYYY-MM-DD',
]

const importModes: Array<{
  value: PlannerImportMode
  title: string
  description: string
  detail: string
}> = [
  {
    value: 'replace',
    title: '覆盖当前数据',
    description: '清空本地保存的内容，整包替换。',
    detail: '适合重新导入一份完整 JSON。',
  },
  {
    value: 'append',
    title: '追加到现有数据',
    description: '保留本地内容，把新任务并入。',
    detail: '适合临时补充任务或增量更新。',
  },
]

const importSuccessDelayMs = 1200
const importParsePauseMs = 140

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const importPlannerData = usePlannerStore((state) => state.importPlannerData)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [rawJson, setRawJson] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [importMode, setImportMode] = useState<PlannerImportMode>('replace')

  const closeDialog = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    onClose()
  }, [onClose])

  const focusPasteArea = () => {
    textareaRef.current?.focus()
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  useEffect(() => {
    if (!open) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      setRawJson('')
      setFileName('')
      setError('')
      setStatus('')
      setIsBusy(false)
      setImportMode('replace')
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDialog, open])

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

  const runImport = async (text: string) => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    setIsBusy(true)
    setError('')
    setStatus('正在解析 JSON...')

    try {
      await new Promise((resolve) => window.setTimeout(resolve, importParsePauseMs))

      const parsed = JSON.parse(text) as {
        macroTasks?: unknown[]
        microTasks?: unknown[]
      }
      const imported = importPlannerData(parsed, importMode)
      const macroCount = Array.isArray(parsed.macroTasks) ? parsed.macroTasks.length : 0
      const microCount = Array.isArray(parsed.microTasks) ? parsed.microTasks.length : 0
      const summary = `${importMode === 'replace' ? '已覆盖' : '已追加'} ${macroCount} 条宏任务 / ${microCount} 条微任务`

      setStatus(
        importMode === 'append'
          ? `${summary}，当前共有 ${imported.macroTasks.length} 条宏任务 / ${imported.microTasks.length} 条微任务，即将关闭`
          : `${summary}，即将关闭`,
      )
      closeTimerRef.current = window.setTimeout(() => {
        closeDialog()
      }, importSuccessDelayMs)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'JSON 解析失败'
      setError(message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setFileName(file.name)
    setRawJson(text)
    await runImport(text)
    event.target.value = ''
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runImport(rawJson)
  }

  const currentMode = importModes.find((mode) => mode.value === importMode) ?? importModes[0]

  if (!open) return null

  return (
    <div className="import-backdrop" onClick={closeDialog} role="presentation">
      <section
        className="import-dialog"
        aria-label="一键导入 JSON"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="import-dialog__header">
          <div>
            <p className="eyebrow">AI JSON Import</p>
            <h2>一键导入</h2>
          </div>
          <button
            className="ghost-icon"
            onClick={closeDialog}
            type="button"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <div className="import-dialog__body">
          <aside className="import-guidance">
            <p>
              先让 AI 按说明文档生成完整 JSON，再把文件拖进来或直接粘贴。
              文件导入和粘贴导入只是输入方式，真正结果由导入模式决定。
            </p>

            <div
              className={`import-mode-hero mode-${importMode}`}
              aria-live="polite"
            >
              <span>当前导入模式</span>
              <strong>{currentMode.title}</strong>
              <small>{currentMode.detail}</small>
            </div>

            <div className="import-mode-grid" role="radiogroup" aria-label="导入模式">
              {importModes.map((mode) => {
                const isActive = importMode === mode.value
                const Icon = mode.value === 'replace' ? RotateCcw : Plus

                return (
                  <button
                    className={`import-mode-card mode-${mode.value} ${
                      isActive ? 'is-active' : ''
                    }`}
                    key={mode.value}
                    onClick={() => setImportMode(mode.value)}
                    type="button"
                    aria-pressed={isActive}
                  >
                    <div className="import-mode-card__icon" aria-hidden="true">
                      <Icon size={18} />
                    </div>
                    <div className="import-mode-card__copy">
                      <div className="import-mode-card__titleline">
                        <strong>{mode.title}</strong>
                        {isActive ? (
                          <span className="import-mode-card__selected">
                            <Check size={13} />
                            当前选中
                          </span>
                        ) : null}
                      </div>
                      <span>{mode.description}</span>
                      <small>{mode.detail}</small>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="import-guidance__chips">
              {helperIdRows.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <label className="import-file-button">
              <Upload size={16} />
              选择 JSON 文件
              <input
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileChange}
                type="file"
              />
            </label>

            <button className="text-button" type="button" onClick={focusPasteArea}>
              切换到粘贴输入
            </button>
          </aside>

          <form className="import-form" onSubmit={handleSubmit}>
            <label className="field import-field">
              <span>JSON 内容</span>
              <textarea
                ref={textareaRef}
                autoFocus
                placeholder="粘贴 AI 生成的 JSON，顶层需要包含 version、view、macroTasks、microTasks"
                value={rawJson}
                onChange={(event) => setRawJson(event.target.value)}
              />
            </label>

            <div className="import-status" aria-live="polite">
              {fileName ? <span>已读取：{fileName}</span> : <span>等待文件或粘贴内容</span>}
              {status ? <strong className="stable">{status}</strong> : null}
              {error ? <strong className="danger">{error}</strong> : null}
            </div>

            <div className="import-actions">
              <button className="primary-button" type="submit" disabled={isBusy}>
                <Upload size={16} />
                {isBusy ? '导入中...' : '导入'}
              </button>
              <button className="text-button" type="button" onClick={closeDialog}>
                取消
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
