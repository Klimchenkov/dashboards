'use client'
import { useEffect, useState } from 'react'
import { VizRenderer } from './VizRegistry'
import { runQuery } from './api'
import type { VizSchema } from './types'

export default function VisualizationCard({ viz }: { viz: VizSchema }) {
  const [data, setData] = useState<any[]>([])
  useEffect(() => { runQuery(viz.query).then(setData).catch(console.error) }, [viz])
  return (
    <div className="h-full w-full bg-white rounded-2xl shadow p-3 flex flex-col">
      <div className="text-sm font-medium mb-2">{viz.title}</div>
      <div className="flex-1 min-h-0">
        <VizRenderer type={viz.chart.type} data={data} x={viz.chart.x} y={viz.chart.y} />
      </div>
    </div>
  )
}
