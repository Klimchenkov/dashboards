'use client'
import GridLayout from 'react-grid-layout'
import VisualizationCard from './components/VisualizationCard'
import type { DashboardSchema } from './components/types'

export default function DashboardCanvas({ schema }: { schema: DashboardSchema }) {
  return (
    <GridLayout className="layout" cols={12} rowHeight={40} width={1200} margin={[12,12]} isDraggable={false} isResizable={false}>
      {schema.widgets.map((w) => {
        const l = schema.layout.find(i => i.i === w.id)!
        return (
          <div key={w.id} data-grid={l}>
            <VisualizationCard viz={w} />
          </div>
        )
      })}
    </GridLayout>
  )
}
