'use client'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import VisualizationCard from './VisualizationCard'
import type { DashboardSchema } from './types'
import { useState } from 'react'
import { saveDashboard } from './api'

export default function CanvasEditor({ initial }: { initial: DashboardSchema }) {
  const [layout, setLayout] = useState(initial.layout)
  const [name, setName] = useState('Новый дэшборд')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<number|null>(null)

  const onLayoutChange = (lay: Layout[]) => {
    setLayout(lay as any)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const schema = { layout, widgets: initial.widgets }
      const { id } = await saveDashboard(name, schema)
      setSavedId(id)
    } catch (e) {
      console.error(e)
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} className="border px-3 py-2 rounded w-72" placeholder="Название дэшборда" />
        <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
        {savedId && (
          <a className="text-blue-700 underline" href={`/dash/${savedId}`}>
            Открыть /dash/{savedId}
          </a>
        )}
      </div>

      <GridLayout
        className="layout"
        cols={12}
        rowHeight={40}
        width={1200}
        margin={[12,12]}
        onLayoutChange={onLayoutChange}
        draggableHandle=".drag-handle"
        compactType={null}
      >
        {initial.widgets.map((w) => {
          const l = (layout.find(i => i.i === w.id) as any) || {x:0,y:Infinity,w:3,h:6,i:w.id}
          return (
            <div key={w.id} data-grid={l} className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="drag-handle cursor-move px-3 py-2 text-xs bg-slate-100">{w.title}</div>
              <div className="p-2 h-[calc(100%-2rem)]">
                <VisualizationCard viz={w} />
              </div>
            </div>
          )
        })}
      </GridLayout>
    </div>
  )
}
