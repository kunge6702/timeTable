import { Activity, CalendarCheck2, Download, Map, Upload } from 'lucide-react'
import { useState } from 'react'
import { ExecutionDashboard } from './components/ExecutionDashboard'
import { ImportDialog } from './components/ImportDialog'
import { StrategicPlanner } from './components/StrategicPlanner'
import { usePlannerStore } from './store/plannerStore'
import { getTodayISO } from './utils/date'

function App() {
  const [isImportOpen, setImportOpen] = useState(false)
  const view = usePlannerStore((state) => state.view)
  const setView = usePlannerStore((state) => state.setView)

  const handleExport = () => {
    const { view: currentView, macroTasks, microTasks } = usePlannerStore.getState()
    const payload = {
      version: 1,
      view: currentView,
      macroTasks,
      microTasks,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `postgrad-ops-${getTodayISO()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <main className="app-shell">
        <header className="topbar">
          <div className="brand-mark" aria-label="考研项目管理系统">
            <Activity size={22} />
            <span>POSTGRAD OPS</span>
          </div>

          <div className="topbar-actions">
            <button className="text-button export-launch" onClick={handleExport} type="button">
              <Download size={16} />
              一键导出
            </button>
            <button
              className="text-button import-launch"
              onClick={() => setImportOpen(true)}
              type="button"
            >
              <Upload size={16} />
              一键导入
            </button>

            <nav className="view-switch" aria-label="工作台切换">
              <button
                className={view === 'execution' ? 'is-active' : ''}
                onClick={() => setView('execution')}
                type="button"
              >
                <CalendarCheck2 size={18} />
                今日看板
              </button>
              <button
                className={view === 'strategy' ? 'is-active' : ''}
                onClick={() => setView('strategy')}
                type="button"
              >
                <Map size={18} />
                上帝视角
              </button>
            </nav>
          </div>
        </header>

        {view === 'execution' ? <ExecutionDashboard /> : <StrategicPlanner />}
      </main>

      <ImportDialog open={isImportOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}

export default App
