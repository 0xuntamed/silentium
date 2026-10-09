import { useEffect, useState } from 'react'
import { conductor, setProgram } from './conductor'
import { engine } from './engine'

/** Dev-only (`?debug`): scrub the conductor program and poke the system. */
export function DebugPanel() {
  const [p, setP] = useState(0)
  const [stats, setStats] = useState('')

  useEffect(() => {
    setProgram(p)
    return () => setProgram(null)
  }, [p])

  useEffect(() => {
    const id = setInterval(() => {
      const s = engine.stats
      const w = conductor.weights
      setStats(
        `sim ${s.simMs.toFixed(2)} ms · write ${s.writeMs.toFixed(2)} ms · n ${engine.sim?.n}\n` +
          `staff ${w.staff.toFixed(2)} wave ${w.wave.toFixed(2)} outline ${w.outline.toFixed(2)} cable ${w.cable.toFixed(2)}`,
      )
    }, 250)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      data-no-enter
      className="fixed bottom-4 left-4 z-[90] w-72 rounded border border-bone/20 bg-basalt/90 p-3 font-sans text-xs text-bone"
    >
      <label className="label label-bone block">
        Program {p.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={p}
          onChange={(e) => setP(Number(e.target.value))}
          className="mt-2 w-full"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <button className="label rounded border border-bone/25 px-2 py-1" onClick={() => engine.sim?.burst(0, 0, 700, 2.4)}>
          Burst
        </button>
        <button className="label rounded border border-bone/25 px-2 py-1" onClick={() => setP(0)}>
          Free
        </button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap text-[10px] text-ash">{stats}</pre>
    </div>
  )
}
