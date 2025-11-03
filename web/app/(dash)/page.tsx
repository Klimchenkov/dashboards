import CanvasEditor from './components/CanvasEditor'
import DashboardCanvas from '../DashboardCanvas'

const demo = {
  layout: [
    { i: 'viz1', x: 0, y: 0, w: 6, h: 8 },
    { i: 'viz2', x: 6, y: 0, w: 6, h: 8 },
    { i: 'viz3', x: 0, y: 8, w: 12, h: 8 }
  ],
  widgets: [
    { id: 'viz1', title: 'План vs Факт (дни)', datasetKey: 'timeseries_usage', chart: { type: 'area', x: 'date', y: ['planned_useful_hours','fact_useful_hours'] }, query: { datasetKey:'timeseries_usage', select:['date','planned_useful_hours','fact_useful_hours'], sort:[{field:'date',dir:'asc'}], limit: 180 } },
    { id: 'viz2', title: 'Внутренние часы', datasetKey: 'timeseries_usage', chart: { type: 'bar', x: 'date', y: ['fact_internal_hours'] }, query: { datasetKey:'timeseries_usage', select:['date','fact_internal_hours'], sort:[{field:'date',dir:'asc'}], limit: 180 } },
    { id: 'viz3', title: 'Capacity vs Utilization', datasetKey: 'capacity_vs_utilization', chart: { type: 'line', x: 'date', y: ['capacity_hours','planned_hours','fact_total_hours'] }, query: { datasetKey:'timeseries_usage', select:['date','planned_useful_hours','fact_useful_hours','fact_internal_hours','target_useful_hours'], sort:[{field:'date',dir:'asc'}], limit: 180 } }
  ]
}

export default function Page() {
  return (
    <main className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Конструктор с полотном</h1>
      <CanvasEditor initial={demo as any} />
      <h2 className="text-xl font-semibold">Просмотр дашборда</h2>
      <DashboardCanvas schema={demo as any} />
    </main>
  )
}
