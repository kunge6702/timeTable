import { Activity, CalendarCheck2, Map } from 'lucide-react'
import { ExecutionDashboard } from './components/ExecutionDashboard'
import { StrategicPlanner } from './components/StrategicPlanner'
import { usePlannerStore } from './store/plannerStore'

function App() {
  const view = usePlannerStore((state) => state.view)
  const setView = usePlannerStore((state) => state.setView)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-label="考研项目管理系统">
          <Activity size={22} />
          <span>POSTGRAD OPS</span>
        </div>
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
      </header>

      {view === 'execution' ? <ExecutionDashboard /> : <StrategicPlanner />}
    </main>
  )
}

export default App
